import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { cert, getApps, initializeApp, type App as FirebaseAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore as getAdminFirestore, type Firestore } from 'firebase-admin/firestore';

export interface RazorpayRuntimeSecrets {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  firebaseProjectId: string;
  firestoreDatabaseId: string;
  firebaseServiceAccountJson?: string;
  allowAmbientAdminCredentials?: boolean;
}

export interface StoredOrderSnapshot {
  id: string;
  orderNumber: string;
  customerUid: string;
  totalAmount: number;
  paymentStatus: string;
  fulfilmentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

export interface RazorpayOrderBindingInput {
  razorpayOrderId: string;
  firestoreOrderId: string;
  orderNumber: string;
  customerUid: string;
  amountPaise: number;
  currency: 'INR';
}

export type SettlementOutcome =
  | {
      status: 'settled';
      firestoreOrderId: string;
      orderNumber: string;
      paymentStatus: 'paid';
      fulfilmentStatus: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      duplicate: false;
    }
  | {
      status: 'already_settled';
      firestoreOrderId: string;
      orderNumber: string;
      paymentStatus: 'paid';
      fulfilmentStatus: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      duplicate: true;
    }
  | {
      status: 'duplicate_webhook_event';
      duplicate: true;
    }
  | {
      status: 'order_not_found' | 'ownership_mismatch' | 'order_id_mismatch' | 'amount_mismatch' | 'order_cancelled';
      message: string;
    };

export interface PaymentStoreAdapter {
  readonly hasAdminWriteAccess: boolean;
  getOrderForCheckout(firestoreOrderId: string, callerIdToken?: string): Promise<StoredOrderSnapshot | null>;
  saveRazorpayOrderBinding(binding: RazorpayOrderBindingInput): Promise<void>;
  settleOrderPaymentAtomically(params: {
    firestoreOrderId?: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    verifiedAmountPaise: number;
    verifiedCurrency: string;
    verifiedBy: 'razorpay_signature_verify' | 'razorpay_webhook';
    expectedCustomerUid?: string;
    webhookEventId?: string;
    webhookEventType?: string;
  }): Promise<SettlementOutcome>;
  recordWebhookAuditEventAtomically(params: {
    eventId: string;
    eventType: string;
    outcome: 'payment_failed_recorded' | 'ignored';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    firestoreOrderId?: string;
    failureDescription?: string;
  }): Promise<{ duplicate: boolean }>;
}

export interface RazorpayGatewayClient {
  createOrder(params: {
    keyId: string;
    keySecret: string;
    amountPaise: number;
    currency: 'INR';
    receipt: string;
    notes: Record<string, string>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    receipt: string;
  }>;
  fetchPayment(params: {
    keyId: string;
    keySecret: string;
    paymentId: string;
  }): Promise<{
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    notes?: Record<string, string>;
  }>;
}

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const HEX_SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;

export function isSafeDocumentId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID_PATTERN.test(value);
}

/**
 * Timing-safe verification of Razorpay Checkout signature:
 * HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
 */
export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}): boolean {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret } = params;
  if (
    !keySecret ||
    !isSafeDocumentId(razorpayOrderId) ||
    !isSafeDocumentId(razorpayPaymentId) ||
    typeof razorpaySignature !== 'string' ||
    !HEX_SHA256_PATTERN.test(razorpaySignature)
  ) {
    return false;
  }

  const expectedDigest = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`, 'utf8')
    .digest();

  const receivedDigest = Buffer.from(razorpaySignature, 'hex');
  if (expectedDigest.length !== receivedDigest.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedDigest, receivedDigest);
}

/**
 * Timing-safe verification of Razorpay Webhook signature over exact raw HTTP body bytes:
 * HMAC-SHA256(rawBodyBuffer, RAZORPAY_WEBHOOK_SECRET)
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: Buffer;
  signatureHeader: string;
  webhookSecret: string;
}): boolean {
  const { rawBody, signatureHeader, webhookSecret } = params;
  if (
    !webhookSecret ||
    !Buffer.isBuffer(rawBody) ||
    rawBody.length === 0 ||
    typeof signatureHeader !== 'string' ||
    !HEX_SHA256_PATTERN.test(signatureHeader.trim())
  ) {
    return false;
  }

  const expectedDigest = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest();

  const receivedDigest = Buffer.from(signatureHeader.trim(), 'hex');
  if (expectedDigest.length !== receivedDigest.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedDigest, receivedDigest);
}

export function deriveWebhookEventId(eventIdHeader: string | undefined, rawBody: Buffer): string {
  const trimmed = (eventIdHeader || '').trim();
  if (trimmed.length >= 6 && trimmed.length <= 120 && SAFE_ID_PATTERN.test(trimmed)) {
    return `evt_${trimmed}`;
  }
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 48);
  return `evt_sha_${bodyHash}`;
}

export const defaultRazorpayGatewayClient: RazorpayGatewayClient = {
  async createOrder({ keyId, keySecret, amountPaise, currency, receipt, notes }) {
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64');
    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt: receipt.slice(0, 40),
        notes,
      }),
    });

    const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    if (!resp.ok || typeof json.id !== 'string') {
      const errObj = (json.error as Record<string, unknown> | undefined) ?? {};
      const desc =
        typeof errObj.description === 'string'
          ? errObj.description
          : `Razorpay order creation failed with HTTP ${resp.status}.`;
      throw new Error(desc);
    }

    return {
      id: String(json.id),
      amount: Number(json.amount ?? amountPaise),
      currency: String(json.currency ?? currency),
      status: String(json.status ?? 'created'),
      receipt: String(json.receipt ?? receipt),
    };
  },

  async fetchPayment({ keyId, keySecret, paymentId }) {
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64');
    const resp = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: 'application/json',
        },
      }
    );

    const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    if (!resp.ok || typeof json.id !== 'string') {
      const errObj = (json.error as Record<string, unknown> | undefined) ?? {};
      const desc =
        typeof errObj.description === 'string'
          ? errObj.description
          : `Razorpay payment lookup failed with HTTP ${resp.status}.`;
      throw new Error(desc);
    }

    const rawNotes = (json.notes as Record<string, unknown> | undefined) ?? {};
    const sanitizedNotes: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawNotes)) {
      if (v !== undefined && v !== null) {
        sanitizedNotes[k] = String(v);
      }
    }

    return {
      id: String(json.id),
      order_id: String(json.order_id ?? ''),
      amount: Number(json.amount ?? 0),
      currency: String(json.currency ?? ''),
      status: String(json.status ?? ''),
      notes: sanitizedNotes,
    };
  },
};

export function loadDefaultProjectIdentifiers(): {
  projectId: string;
  firestoreDatabaseId: string;
} {
  let appletProjectId = '';
  let appletDbId = '';
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
        projectId?: string;
        firestoreDatabaseId?: string;
      };
      appletProjectId = (parsed.projectId || '').trim();
      appletDbId = (parsed.firestoreDatabaseId || '').trim();
    }
  } catch {
    // Ignore missing or unreadable local applet config
  }

  const projectId =
    appletProjectId ||
    (process.env.FIREBASE_PROJECT_ID || '').trim() ||
    (process.env.GCLOUD_PROJECT || '').trim() ||
    (process.env.VITE_FIREBASE_PROJECT_ID || '').trim();

  const envDbId =
    (process.env.FIREBASE_DATABASE_ID || '').trim() ||
    (process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '').trim();

  const firestoreDatabaseId =
    appletDbId || (envDbId && envDbId !== '(default)' ? envDbId : '(default)');

  return { projectId, firestoreDatabaseId };
}

export function createFirebaseAdminServices(secrets: RazorpayRuntimeSecrets): {
  verifyBearerToken: (bearerToken: string) => Promise<{
    uid: string;
    email?: string;
    emailVerified: boolean;
  }>;
  store: PaymentStoreAdapter;
} {
  const appName = `califnco-razorpay-${secrets.firebaseProjectId || 'default'}`;
  const existingApp = getApps().find((a) => a.name === appName);

  let hasPrivilegedFirestoreCreds = false;
  let adminApp: FirebaseAdminApp;

  if (secrets.firebaseServiceAccountJson && secrets.firebaseServiceAccountJson.trim()) {
    const parsedCreds = JSON.parse(secrets.firebaseServiceAccountJson) as Record<string, string>;
    hasPrivilegedFirestoreCreds = true;
    adminApp =
      existingApp ??
      initializeApp(
        {
          credential: cert(parsedCreds),
          projectId: parsedCreds.project_id || secrets.firebaseProjectId,
        },
        appName
      );
  } else if (secrets.allowAmbientAdminCredentials) {
    hasPrivilegedFirestoreCreds = true;
    adminApp =
      existingApp ??
      initializeApp(
        {
          projectId: secrets.firebaseProjectId,
        },
        appName
      );
  } else {
    hasPrivilegedFirestoreCreds = false;
    adminApp =
      existingApp ??
      initializeApp(
        {
          projectId: secrets.firebaseProjectId,
        },
        appName
      );
  }

  const adminAuth = getAdminAuth(adminApp);
  const adminFirestore: Firestore | null = hasPrivilegedFirestoreCreds
    ? secrets.firestoreDatabaseId && secrets.firestoreDatabaseId !== '(default)'
      ? getAdminFirestore(adminApp, secrets.firestoreDatabaseId)
      : getAdminFirestore(adminApp)
    : null;

  async function verifyBearerToken(bearerToken: string) {
    const decoded = await adminAuth.verifyIdToken(bearerToken, false);
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: Boolean(decoded.email_verified),
    };
  }

  async function fetchOrderViaRestWithCallerToken(
    firestoreOrderId: string,
    callerIdToken: string
  ): Promise<StoredOrderSnapshot | null> {
    const dbSegment =
      secrets.firestoreDatabaseId && secrets.firestoreDatabaseId !== '(default)'
        ? encodeURIComponent(secrets.firestoreDatabaseId)
        : '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      secrets.firebaseProjectId
    )}/databases/${dbSegment}/documents/orders/${encodeURIComponent(firestoreOrderId)}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${callerIdToken}`,
        Accept: 'application/json',
      },
    });

    if (resp.status === 404) {
      return null;
    }
    if (!resp.ok) {
      throw new Error(`Firestore order lookup failed with HTTP ${resp.status}.`);
    }

    const docJson = (await resp.json()) as {
      fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number }>;
    };
    const f = docJson.fields ?? {};
    const readStr = (key: string) => f[key]?.stringValue ?? '';
    const readNum = (key: string) => {
      if (typeof f[key]?.doubleValue === 'number') return Number(f[key].doubleValue);
      if (typeof f[key]?.integerValue === 'string') return Number(f[key].integerValue);
      return 0;
    };

    return {
      id: firestoreOrderId,
      orderNumber: readStr('orderNumber'),
      customerUid: readStr('customerUid'),
      totalAmount: readNum('totalAmount'),
      paymentStatus: readStr('paymentStatus'),
      fulfilmentStatus: readStr('fulfilmentStatus'),
      razorpayOrderId: readStr('razorpayOrderId') || undefined,
      razorpayPaymentId: readStr('razorpayPaymentId') || undefined,
    };
  }

  const store: PaymentStoreAdapter = {
    hasAdminWriteAccess: Boolean(adminFirestore),

    async getOrderForCheckout(firestoreOrderId, callerIdToken) {
      if (adminFirestore) {
        const snap = await adminFirestore.collection('orders').doc(firestoreOrderId).get();
        if (!snap.exists) return null;
        const d = snap.data() ?? {};
        return {
          id: snap.id,
          orderNumber: String(d.orderNumber ?? ''),
          customerUid: String(d.customerUid ?? ''),
          totalAmount: Number(d.totalAmount ?? 0),
          paymentStatus: String(d.paymentStatus ?? ''),
          fulfilmentStatus: String(d.fulfilmentStatus ?? ''),
          razorpayOrderId: d.razorpayOrderId ? String(d.razorpayOrderId) : undefined,
          razorpayPaymentId: d.razorpayPaymentId ? String(d.razorpayPaymentId) : undefined,
        };
      }
      if (callerIdToken) {
        return fetchOrderViaRestWithCallerToken(firestoreOrderId, callerIdToken);
      }
      return null;
    },

    async saveRazorpayOrderBinding(binding) {
      if (!adminFirestore) return;
      const now = FieldValue.serverTimestamp();
      const batch = adminFirestore.batch();
      batch.set(adminFirestore.collection('razorpay_orders').doc(binding.razorpayOrderId), {
        ...binding,
        status: 'created',
        createdAtIso: new Date().toISOString(),
        createdAt: now,
        updatedAt: now,
      });
      batch.update(adminFirestore.collection('orders').doc(binding.firestoreOrderId), {
        razorpayOrderId: binding.razorpayOrderId,
        updatedAt: now,
      });
      await batch.commit();
    },

    async settleOrderPaymentAtomically(params) {
      if (!adminFirestore) {
        throw new Error(
          'Privileged Firestore Admin credentials (FIREBASE_SERVICE_ACCOUNT_JSON or Cloud Functions runtime) are required to mark orders as paid.'
        );
      }

      const {
        razorpayOrderId,
        razorpayPaymentId,
        verifiedAmountPaise,
        verifiedCurrency,
        verifiedBy,
        expectedCustomerUid,
        webhookEventId,
        webhookEventType,
      } = params;

      return adminFirestore.runTransaction(async (tx) => {
        const now = FieldValue.serverTimestamp();
        const nowIso = new Date().toISOString();

        // 1. Webhook event-level deduplication
        if (webhookEventId) {
          const eventRef = adminFirestore.collection('payment_webhook_events').doc(webhookEventId);
          const eventSnap = await tx.get(eventRef);
          if (eventSnap.exists) {
            return { status: 'duplicate_webhook_event' as const, duplicate: true as const };
          }
        }

        // 2. Resolve target Firestore order ID from explicit param or server-side razorpay_orders binding
        let resolvedOrderId = params.firestoreOrderId || '';
        const rzpOrderRef = adminFirestore.collection('razorpay_orders').doc(razorpayOrderId);
        const rzpOrderSnap = await tx.get(rzpOrderRef);
        if (!resolvedOrderId && rzpOrderSnap.exists) {
          resolvedOrderId = String(rzpOrderSnap.data()?.firestoreOrderId ?? '');
        }
        if (!resolvedOrderId || !isSafeDocumentId(resolvedOrderId)) {
          return {
            status: 'order_not_found' as const,
            message: `No Califnco Firestore order bound to Razorpay order ${razorpayOrderId}.`,
          };
        }

        // 3. Read payment settlement ledger & target order inside transaction
        const settlementRef = adminFirestore
          .collection('payment_settlements')
          .doc(razorpayPaymentId);
        const orderRef = adminFirestore.collection('orders').doc(resolvedOrderId);
        const notifId = `notif_pay_${resolvedOrderId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
        const notifRef = adminFirestore.collection('notifications').doc(notifId);

        const [settlementSnap, orderSnap] = await Promise.all([
          tx.get(settlementRef),
          tx.get(orderRef),
        ]);

        if (!orderSnap.exists) {
          return {
            status: 'order_not_found' as const,
            message: `Firestore order ${resolvedOrderId} does not exist.`,
          };
        }

        const orderData = orderSnap.data() ?? {};
        const customerUid = String(orderData.customerUid ?? '');
        const orderNumber = String(orderData.orderNumber ?? resolvedOrderId);
        const existingPaymentStatus = String(orderData.paymentStatus ?? '');
        const existingFulfilment = String(orderData.fulfilmentStatus ?? 'pending');
        const boundRzpOrderId = orderData.razorpayOrderId
          ? String(orderData.razorpayOrderId)
          : undefined;
        const expectedAmountPaise = Math.round(Number(orderData.totalAmount ?? 0) * 100);

        if (expectedCustomerUid && customerUid !== expectedCustomerUid) {
          return {
            status: 'ownership_mismatch' as const,
            message: 'Authenticated user does not own the target order.',
          };
        }

        if (boundRzpOrderId && boundRzpOrderId !== razorpayOrderId) {
          return {
            status: 'order_id_mismatch' as const,
            message: 'Razorpay order ID does not match the bound Firestore order.',
          };
        }

        if (verifiedCurrency !== 'INR' || verifiedAmountPaise !== expectedAmountPaise) {
          return {
            status: 'amount_mismatch' as const,
            message: `Verified payment (${verifiedCurrency} ${verifiedAmountPaise} paise) does not match order total (${expectedAmountPaise} paise).`,
          };
        }

        if (existingFulfilment === 'cancelled') {
          return {
            status: 'order_cancelled' as const,
            message: `Order ${orderNumber} is cancelled and requires refund review.`,
          };
        }

        // 4. Payment-level idempotency check (prevents verify-payment + webhook double settlement)
        if (settlementSnap.exists || existingPaymentStatus === 'paid') {
          if (webhookEventId) {
            tx.set(adminFirestore.collection('payment_webhook_events').doc(webhookEventId), {
              eventId: webhookEventId,
              eventType: webhookEventType || 'payment.captured',
              razorpayOrderId,
              razorpayPaymentId,
              firestoreOrderId: resolvedOrderId,
              outcome: 'already_settled',
              processedAtIso: nowIso,
              processedAt: now,
            });
          }
          return {
            status: 'already_settled' as const,
            firestoreOrderId: resolvedOrderId,
            orderNumber,
            paymentStatus: 'paid' as const,
            fulfilmentStatus: existingFulfilment,
            razorpayOrderId,
            razorpayPaymentId: String(orderData.razorpayPaymentId ?? razorpayPaymentId),
            duplicate: true as const,
          };
        }

        // 5. Commit trusted settlement atomically
        const nextFulfilment = existingFulfilment === 'pending' ? 'confirmed' : existingFulfilment;

        tx.update(orderRef, {
          paymentStatus: 'paid',
          fulfilmentStatus: nextFulfilment,
          razorpayOrderId,
          razorpayPaymentId,
          paymentVerifiedSource: verifiedBy,
          updatedAt: now,
        });

        tx.set(settlementRef, {
          razorpayPaymentId,
          razorpayOrderId,
          firestoreOrderId: resolvedOrderId,
          amountPaise: verifiedAmountPaise,
          currency: 'INR',
          verifiedBy,
          settledAtIso: nowIso,
          settledAt: now,
        });

        tx.set(
          rzpOrderRef,
          {
            razorpayOrderId,
            firestoreOrderId: resolvedOrderId,
            orderNumber,
            customerUid,
            amountPaise: verifiedAmountPaise,
            currency: 'INR',
            status: 'paid',
            razorpayPaymentId,
            updatedAt: now,
          },
          { merge: true }
        );

        if (isSafeDocumentId(customerUid)) {
          tx.set(notifRef, {
            recipientUid: customerUid,
            title: `Payment Verified for ${orderNumber}`.slice(0, 140),
            body: `Your online payment of ₹${Math.round(
              verifiedAmountPaise / 100
            ).toLocaleString('en-IN')} (${razorpayPaymentId}) for order ${orderNumber} has been verified and confirmed.`.slice(
              0,
              500
            ),
            eventType: 'payment_settled',
            orderId: resolvedOrderId,
            orderNumber: orderNumber.slice(0, 40),
            source: 'trusted_backend_order_event',
            isRead: false,
            createdAtIso: nowIso,
            createdByUid: 'system_razorpay_verifier',
            createdAt: now,
            updatedAt: now,
          });
        }

        if (webhookEventId) {
          tx.set(adminFirestore.collection('payment_webhook_events').doc(webhookEventId), {
            eventId: webhookEventId,
            eventType: webhookEventType || 'payment.captured',
            razorpayOrderId,
            razorpayPaymentId,
            firestoreOrderId: resolvedOrderId,
            outcome: 'settled',
            processedAtIso: nowIso,
            processedAt: now,
          });
        }

        return {
          status: 'settled' as const,
          firestoreOrderId: resolvedOrderId,
          orderNumber,
          paymentStatus: 'paid' as const,
          fulfilmentStatus: nextFulfilment,
          razorpayOrderId,
          razorpayPaymentId,
          duplicate: false as const,
        };
      });
    },

    async recordWebhookAuditEventAtomically(params) {
      if (!adminFirestore) {
        throw new Error('Privileged Firestore Admin credentials are not configured.');
      }
      return adminFirestore.runTransaction(async (tx) => {
        const eventRef = adminFirestore.collection('payment_webhook_events').doc(params.eventId);
        const snap = await tx.get(eventRef);
        if (snap.exists) {
          return { duplicate: true };
        }
        const now = FieldValue.serverTimestamp();
        tx.set(eventRef, {
          eventId: params.eventId,
          eventType: params.eventType.slice(0, 64),
          razorpayOrderId: (params.razorpayOrderId || '').slice(0, 64),
          razorpayPaymentId: (params.razorpayPaymentId || '').slice(0, 64),
          firestoreOrderId: (params.firestoreOrderId || '').slice(0, 128),
          outcome: params.outcome,
          processedAtIso: new Date().toISOString(),
          processedAt: now,
        });
        if (params.outcome === 'payment_failed_recorded' && params.razorpayOrderId && isSafeDocumentId(params.razorpayOrderId)) {
          tx.set(
            adminFirestore.collection('razorpay_orders').doc(params.razorpayOrderId),
            {
              status: 'failed',
              lastFailureDescription: (params.failureDescription || 'Payment failed').slice(0, 240),
              updatedAt: now,
            },
            { merge: true }
          );
        }
        return { duplicate: false };
      });
    },
  };

  return { verifyBearerToken, store };
}

export interface RazorpayHandlerDependencies {
  getSecrets: () => RazorpayRuntimeSecrets;
  verifyBearerToken: (token: string) => Promise<{
    uid: string;
    email?: string;
    emailVerified: boolean;
  }>;
  getStore: () => PaymentStoreAdapter;
  gateway?: RazorpayGatewayClient;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 20 ? token : null;
}

export function createRazorpayHttpHandlers(deps: RazorpayHandlerDependencies) {
  const gateway = deps.gateway ?? defaultRazorpayGatewayClient;

  return {
    configStatus(_req: Request, res: Response): void {
      const secrets = deps.getSecrets();
      const store = deps.getStore();
      const hasKeyId = Boolean(secrets.razorpayKeyId);
      const hasKeySecret = Boolean(secrets.razorpayKeySecret);
      const hasWebhookSecret = Boolean(secrets.razorpayWebhookSecret);
      const keyMode: 'test' | 'live' | 'unconfigured' = !hasKeyId
        ? 'unconfigured'
        : secrets.razorpayKeyId.startsWith('rzp_live_')
        ? 'live'
        : 'test';

      res.status(200).json({
        ok: true,
        keyMode,
        projectId: secrets.firebaseProjectId,
        firestoreDatabaseId: secrets.firestoreDatabaseId,
        configured: {
          razorpayKeyId: hasKeyId,
          razorpayKeySecret: hasKeySecret,
          razorpayWebhookSecret: hasWebhookSecret,
          firestoreAdmin: store.hasAdminWriteAccess,
        },
        readyForOrderCreation: hasKeyId && hasKeySecret,
        readyForTrustedSettlement: hasKeyId && hasKeySecret && store.hasAdminWriteAccess,
        readyForWebhooks: hasWebhookSecret && store.hasAdminWriteAccess,
      });
    },

    async createOrder(req: Request, res: Response): Promise<void> {
      try {
        const secrets = deps.getSecrets();
        if (!secrets.razorpayKeyId || !secrets.razorpayKeySecret) {
          res.status(503).json({
            error: 'razorpay_secrets_unconfigured',
            message:
              'Server-side RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured on the backend. Order remains pending and unverified.',
          });
          return;
        }

        const bearer = extractBearerToken(req);
        if (!bearer) {
          res.status(401).json({
            error: 'missing_auth_token',
            message: 'Missing Firebase Authentication Bearer token.',
          });
          return;
        }

        let caller: { uid: string; email?: string; emailVerified: boolean };
        try {
          caller = await deps.verifyBearerToken(bearer);
        } catch {
          res.status(401).json({
            error: 'invalid_auth_token',
            message: 'Invalid or expired Firebase ID token.',
          });
          return;
        }

        if (!caller.emailVerified) {
          res.status(403).json({
            error: 'email_not_verified',
            message: 'A verified email account is required to initiate online payments.',
          });
          return;
        }

        const body = (req.body ?? {}) as { firestoreOrderId?: unknown };
        const firestoreOrderId =
          typeof body.firestoreOrderId === 'string' ? body.firestoreOrderId.trim() : '';

        if (!isSafeDocumentId(firestoreOrderId)) {
          res.status(400).json({
            error: 'invalid_order_id',
            message: 'Provide a valid firestoreOrderId.',
          });
          return;
        }

        const store = deps.getStore();
        const order = await store.getOrderForCheckout(firestoreOrderId, bearer);
        if (!order) {
          res.status(404).json({
            error: 'order_not_found',
            message: `Firestore order ${firestoreOrderId} was not found.`,
          });
          return;
        }

        if (order.customerUid !== caller.uid) {
          res.status(403).json({
            error: 'forbidden',
            message: 'You can only create a payment session for your own order.',
          });
          return;
        }

        if (order.paymentStatus === 'paid') {
          res.status(409).json({
            error: 'order_already_paid',
            message: `Order ${order.orderNumber} is already verified as paid.`,
          });
          return;
        }

        if (order.fulfilmentStatus === 'cancelled') {
          res.status(409).json({
            error: 'order_cancelled',
            message: `Order ${order.orderNumber} has been cancelled.`,
          });
          return;
        }

        const amountPaise = Math.round(order.totalAmount * 100);
        if (!Number.isInteger(amountPaise) || amountPaise < 100) {
          res.status(400).json({
            error: 'invalid_order_amount',
            message: 'Order total must be at least ₹1.00 (100 paise).',
          });
          return;
        }

        const rzpOrder = await gateway.createOrder({
          keyId: secrets.razorpayKeyId,
          keySecret: secrets.razorpayKeySecret,
          amountPaise,
          currency: 'INR',
          receipt: order.orderNumber || firestoreOrderId,
          notes: {
            firestoreOrderId,
            orderNumber: order.orderNumber,
            customerUid: caller.uid,
          },
        });

        await store.saveRazorpayOrderBinding({
          razorpayOrderId: rzpOrder.id,
          firestoreOrderId,
          orderNumber: order.orderNumber,
          customerUid: caller.uid,
          amountPaise,
          currency: 'INR',
        });

        res.status(200).json({
          razorpayOrderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          keyId: secrets.razorpayKeyId,
          firestoreOrderId,
          orderNumber: order.orderNumber,
          firestoreAdminActive: store.hasAdminWriteAccess,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to create Razorpay order.';
        res.status(502).json({
          error: 'razorpay_create_failed',
          message,
        });
      }
    },

    async verifyPayment(req: Request, res: Response): Promise<void> {
      try {
        const secrets = deps.getSecrets();
        if (!secrets.razorpayKeyId || !secrets.razorpayKeySecret) {
          res.status(503).json({
            verified: false,
            error: 'razorpay_secrets_unconfigured',
            message:
              'Server-side RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured. Payment remains unverified.',
          });
          return;
        }

        const bearer = extractBearerToken(req);
        if (!bearer) {
          res.status(401).json({
            verified: false,
            error: 'missing_auth_token',
            message: 'Missing Firebase Authentication Bearer token.',
          });
          return;
        }

        let caller: { uid: string; email?: string; emailVerified: boolean };
        try {
          caller = await deps.verifyBearerToken(bearer);
        } catch {
          res.status(401).json({
            verified: false,
            error: 'invalid_auth_token',
            message: 'Invalid or expired Firebase ID token.',
          });
          return;
        }

        const body = (req.body ?? {}) as Record<string, unknown>;
        const firestoreOrderId = String(body.firestoreOrderId ?? '').trim();
        const razorpayOrderId = String(
          body.razorpay_order_id ?? body.razorpayOrderId ?? ''
        ).trim();
        const razorpayPaymentId = String(
          body.razorpay_payment_id ?? body.razorpayPaymentId ?? ''
        ).trim();
        const razorpaySignature = String(
          body.razorpay_signature ?? body.razorpaySignature ?? ''
        ).trim();

        if (
          !isSafeDocumentId(firestoreOrderId) ||
          !isSafeDocumentId(razorpayOrderId) ||
          !isSafeDocumentId(razorpayPaymentId) ||
          !razorpaySignature
        ) {
          res.status(400).json({
            verified: false,
            error: 'invalid_verification_payload',
            message:
              'firestoreOrderId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
          });
          return;
        }

        // 1. Cryptographic HMAC-SHA256 verification
        const signatureValid = verifyRazorpayPaymentSignature({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          keySecret: secrets.razorpayKeySecret,
        });

        if (!signatureValid) {
          res.status(400).json({
            verified: false,
            error: 'invalid_payment_signature',
            message: 'Razorpay payment signature verification failed. Order remains pending.',
          });
          return;
        }

        // 2. Server-to-server capture & amount verification directly with Razorpay
        const paymentDetails = await gateway.fetchPayment({
          keyId: secrets.razorpayKeyId,
          keySecret: secrets.razorpayKeySecret,
          paymentId: razorpayPaymentId,
        });

        if (paymentDetails.order_id !== razorpayOrderId) {
          res.status(400).json({
            verified: false,
            error: 'payment_order_mismatch',
            message: 'Payment ID does not belong to the supplied Razorpay order ID.',
          });
          return;
        }

        if (paymentDetails.status !== 'captured') {
          res.status(202).json({
            verified: false,
            paymentGatewayStatus: paymentDetails.status,
            error: 'payment_not_yet_captured',
            message: `Payment signature is valid, but Razorpay status is "${paymentDetails.status}" (not yet captured). Order remains pending until capture webhook completes.`,
          });
          return;
        }

        const store = deps.getStore();
        if (!store.hasAdminWriteAccess) {
          res.status(503).json({
            verified: false,
            signatureValid: true,
            error: 'firestore_admin_unconfigured',
            message:
              'Razorpay signature & capture were verified, but FIREBASE_SERVICE_ACCOUNT_JSON (or Cloud Functions runtime) is not configured to settle the Firestore order. Order remains pending.',
          });
          return;
        }

        // 3. Atomic Firestore settlement + idempotency ledger
        const outcome = await store.settleOrderPaymentAtomically({
          firestoreOrderId,
          razorpayOrderId,
          razorpayPaymentId,
          verifiedAmountPaise: paymentDetails.amount,
          verifiedCurrency: paymentDetails.currency,
          verifiedBy: 'razorpay_signature_verify',
          expectedCustomerUid: caller.uid,
        });

        if (outcome.status === 'settled' || outcome.status === 'already_settled') {
          res.status(200).json({
            verified: true,
            duplicate: outcome.duplicate,
            firestoreOrderId: outcome.firestoreOrderId,
            orderNumber: outcome.orderNumber,
            paymentStatus: outcome.paymentStatus,
            fulfilmentStatus: outcome.fulfilmentStatus,
            razorpayOrderId: outcome.razorpayOrderId,
            razorpayPaymentId: outcome.razorpayPaymentId,
          });
          return;
        }

        const statusCode = outcome.status === 'ownership_mismatch' ? 403 : 400;
        res.status(statusCode).json({
          verified: false,
          error: outcome.status,
          message: 'message' in outcome ? outcome.message : 'Unable to settle order.',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment verification failed.';
        res.status(502).json({
          verified: false,
          error: 'verification_exception',
          message,
        });
      }
    },

    async handleWebhook(
      req: Request & { rawBody?: Buffer },
      res: Response
    ): Promise<void> {
      try {
        const secrets = deps.getSecrets();
        if (!secrets.razorpayWebhookSecret) {
          res.status(503).json({
            received: false,
            error: 'webhook_secret_unconfigured',
            message: 'RAZORPAY_WEBHOOK_SECRET is not configured on the server.',
          });
          return;
        }

        const store = deps.getStore();
        if (!store.hasAdminWriteAccess) {
          res.status(503).json({
            received: false,
            error: 'firestore_admin_unconfigured',
            message:
              'Privileged Firestore Admin credentials are required to process payment webhooks.',
          });
          return;
        }

        const rawBody: Buffer | null = Buffer.isBuffer(req.rawBody)
          ? req.rawBody
          : Buffer.isBuffer(req.body)
          ? req.body
          : null;

        const signatureHeader = String(req.headers['x-razorpay-signature'] ?? '');
        if (!rawBody || !signatureHeader) {
          res.status(400).json({
            received: false,
            error: 'missing_raw_body_or_signature',
            message: 'Raw webhook payload and X-Razorpay-Signature header are required.',
          });
          return;
        }

        const signatureValid = verifyRazorpayWebhookSignature({
          rawBody,
          signatureHeader,
          webhookSecret: secrets.razorpayWebhookSecret,
        });

        if (!signatureValid) {
          res.status(401).json({
            received: false,
            error: 'invalid_webhook_signature',
            message: 'HMAC-SHA256 webhook signature verification failed.',
          });
          return;
        }

        let parsedEvent: Record<string, unknown>;
        try {
          parsedEvent = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
        } catch {
          res.status(400).json({
            received: false,
            error: 'malformed_json',
            message: 'Webhook body is not valid JSON.',
          });
          return;
        }

        const eventHeader =
          typeof req.headers['x-razorpay-event-id'] === 'string'
            ? req.headers['x-razorpay-event-id']
            : undefined;
        const eventId = deriveWebhookEventId(eventHeader, rawBody);
        const eventType = String(parsedEvent.event ?? 'unknown');

        const payloadRoot = (parsedEvent.payload as Record<string, unknown> | undefined) ?? {};
        const paymentWrapper =
          (payloadRoot.payment as Record<string, unknown> | undefined) ?? {};
        const paymentEntity =
          (paymentWrapper.entity as Record<string, unknown> | undefined) ?? {};
        const orderWrapper = (payloadRoot.order as Record<string, unknown> | undefined) ?? {};
        const orderEntity = (orderWrapper.entity as Record<string, unknown> | undefined) ?? {};

        const paymentNotes =
          (paymentEntity.notes as Record<string, unknown> | undefined) ?? {};
        const orderNotes = (orderEntity.notes as Record<string, unknown> | undefined) ?? {};

        const razorpayPaymentId = String(paymentEntity.id ?? '').trim();
        const razorpayOrderId = String(
          paymentEntity.order_id ?? orderEntity.id ?? ''
        ).trim();
        const firestoreOrderIdHint = String(
          paymentNotes.firestoreOrderId ?? orderNotes.firestoreOrderId ?? ''
        ).trim();

        if (eventType === 'payment.captured' || eventType === 'order.paid') {
          const paymentStatus = String(paymentEntity.status ?? '');
          const amountPaise = Number(paymentEntity.amount ?? orderEntity.amount_paid ?? 0);
          const currency = String(paymentEntity.currency ?? orderEntity.currency ?? '');

          if (
            !isSafeDocumentId(razorpayOrderId) ||
            !isSafeDocumentId(razorpayPaymentId) ||
            paymentStatus !== 'captured'
          ) {
            res.status(400).json({
              received: false,
              error: 'invalid_capture_entity',
              message:
                'Capture webhook requires valid razorpayOrderId, razorpayPaymentId, and status=="captured".',
            });
            return;
          }

          const outcome = await store.settleOrderPaymentAtomically({
            firestoreOrderId: isSafeDocumentId(firestoreOrderIdHint)
              ? firestoreOrderIdHint
              : undefined,
            razorpayOrderId,
            razorpayPaymentId,
            verifiedAmountPaise: amountPaise,
            verifiedCurrency: currency,
            verifiedBy: 'razorpay_webhook',
            webhookEventId: eventId,
            webhookEventType: eventType,
          });

          if (
            outcome.status === 'settled' ||
            outcome.status === 'already_settled' ||
            outcome.status === 'duplicate_webhook_event'
          ) {
            res.status(200).json({
              received: true,
              eventId,
              eventType,
              outcome: outcome.status,
              duplicate: outcome.duplicate,
            });
            return;
          }

          res.status(422).json({
            received: false,
            eventId,
            error: outcome.status,
            message: 'message' in outcome ? outcome.message : 'Order settlement validation failed.',
          });
          return;
        }

        if (eventType === 'payment.failed') {
          const failureDesc = String(paymentEntity.error_description ?? 'Payment failed');
          const audit = await store.recordWebhookAuditEventAtomically({
            eventId,
            eventType,
            outcome: 'payment_failed_recorded',
            razorpayOrderId,
            razorpayPaymentId,
            firestoreOrderId: firestoreOrderIdHint,
            failureDescription: failureDesc,
          });
          res.status(200).json({
            received: true,
            eventId,
            eventType,
            outcome: 'payment_failed_recorded',
            duplicate: audit.duplicate,
          });
          return;
        }

        // Unhandled event types are recorded idempotently and acknowledged with 200 OK
        const ignored = await store.recordWebhookAuditEventAtomically({
          eventId,
          eventType,
          outcome: 'ignored',
          razorpayOrderId,
          razorpayPaymentId,
          firestoreOrderId: firestoreOrderIdHint,
        });
        res.status(200).json({
          received: true,
          eventId,
          eventType,
          outcome: 'ignored',
          duplicate: ignored.duplicate,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Webhook processing failed.';
        res.status(500).json({
          received: false,
          error: 'webhook_internal_error',
          message,
        });
      }
    },
  };
}
