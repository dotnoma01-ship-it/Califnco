import crypto from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

/**
 * Secret Manager parameters configured via:
 *   firebase functions:secrets:set RAZORPAY_KEY_ID
 *   firebase functions:secrets:set RAZORPAY_KEY_SECRET
 *   firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
 */
const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');
const RAZORPAY_WEBHOOK_SECRET = defineSecret('RAZORPAY_WEBHOOK_SECRET');

const FIRESTORE_DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID ||
  'ai-studio-califnco-446b2980-82d0-4b7d-a0e2-2bbecc22b94c';

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const HEX_SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;

function ensureAdmin() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp();
  const auth = getAuth(app);
  const db =
    FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
      ? getFirestore(app, FIRESTORE_DATABASE_ID)
      : getFirestore(app);
  return { auth, db };
}

function isSafeId(val: unknown): val is string {
  return typeof val === 'string' && SAFE_ID_PATTERN.test(val);
}

function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !isSafeId(orderId) || !isSafeId(paymentId) || !HEX_SHA256_PATTERN.test(signature)) {
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`, 'utf8').digest();
  const actual = Buffer.from(signature, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string, webhookSecret: string): boolean {
  const cleanSig = signatureHeader.trim();
  if (!webhookSecret || !Buffer.isBuffer(rawBody) || rawBody.length === 0 || !HEX_SHA256_PATTERN.test(cleanSig)) {
    return false;
  }
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest();
  const actual = Buffer.from(cleanSig, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function deriveEventId(eventIdHeader: string | undefined, rawBody: Buffer): string {
  const trimmed = (eventIdHeader || '').trim();
  if (trimmed.length >= 6 && trimmed.length <= 120 && SAFE_ID_PATTERN.test(trimmed)) {
    return `evt_${trimmed}`;
  }
  return `evt_sha_${crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 48)}`;
}

async function settleOrderInFirestore(params: {
  firestoreOrderId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  verifiedAmountPaise: number;
  verifiedCurrency: string;
  verifiedBy: 'razorpay_signature_verify' | 'razorpay_webhook';
  expectedCustomerUid?: string;
  webhookEventId?: string;
  webhookEventType?: string;
}) {
  const { db } = ensureAdmin();
  return db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();
    const nowIso = new Date().toISOString();

    if (params.webhookEventId) {
      const eventRef = db.collection('payment_webhook_events').doc(params.webhookEventId);
      const eventSnap = await tx.get(eventRef);
      if (eventSnap.exists) {
        return { status: 'duplicate_webhook_event' as const, duplicate: true as const };
      }
    }

    let resolvedOrderId = params.firestoreOrderId || '';
    const rzpOrderRef = db.collection('razorpay_orders').doc(params.razorpayOrderId);
    const rzpOrderSnap = await tx.get(rzpOrderRef);
    if (!resolvedOrderId && rzpOrderSnap.exists) {
      resolvedOrderId = String(rzpOrderSnap.data()?.firestoreOrderId ?? '');
    }
    if (!isSafeId(resolvedOrderId)) {
      return {
        status: 'order_not_found' as const,
        message: `No Califnco Firestore order bound to Razorpay order ${params.razorpayOrderId}.`,
      };
    }

    const settlementRef = db.collection('payment_settlements').doc(params.razorpayPaymentId);
    const orderRef = db.collection('orders').doc(resolvedOrderId);
    const notifId = `notif_pay_${resolvedOrderId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
    const notifRef = db.collection('notifications').doc(notifId);

    const [settlementSnap, orderSnap] = await Promise.all([tx.get(settlementRef), tx.get(orderRef)]);
    if (!orderSnap.exists) {
      return { status: 'order_not_found' as const, message: `Order ${resolvedOrderId} not found.` };
    }

    const orderData = orderSnap.data() ?? {};
    const customerUid = String(orderData.customerUid ?? '');
    const orderNumber = String(orderData.orderNumber ?? resolvedOrderId);
    const existingPaymentStatus = String(orderData.paymentStatus ?? '');
    const existingFulfilment = String(orderData.fulfilmentStatus ?? 'pending');
    const boundRzpOrderId = orderData.razorpayOrderId ? String(orderData.razorpayOrderId) : undefined;
    const expectedPaise = Math.round(Number(orderData.totalAmount ?? 0) * 100);

    if (params.expectedCustomerUid && customerUid !== params.expectedCustomerUid) {
      return { status: 'ownership_mismatch' as const, message: 'Caller does not own this order.' };
    }
    if (boundRzpOrderId && boundRzpOrderId !== params.razorpayOrderId) {
      return { status: 'order_id_mismatch' as const, message: 'Razorpay order ID mismatch.' };
    }
    if (params.verifiedCurrency !== 'INR' || params.verifiedAmountPaise !== expectedPaise) {
      return {
        status: 'amount_mismatch' as const,
        message: `Captured amount (${params.verifiedAmountPaise} paise) != order total (${expectedPaise} paise).`,
      };
    }
    if (existingFulfilment === 'cancelled') {
      return { status: 'order_cancelled' as const, message: 'Order is cancelled.' };
    }

    if (settlementSnap.exists || existingPaymentStatus === 'paid') {
      if (params.webhookEventId) {
        tx.set(db.collection('payment_webhook_events').doc(params.webhookEventId), {
          eventId: params.webhookEventId,
          eventType: params.webhookEventType || 'payment.captured',
          razorpayOrderId: params.razorpayOrderId,
          razorpayPaymentId: params.razorpayPaymentId,
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
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: String(orderData.razorpayPaymentId ?? params.razorpayPaymentId),
        duplicate: true as const,
      };
    }

    const nextFulfilment = existingFulfilment === 'pending' ? 'confirmed' : existingFulfilment;

    tx.update(orderRef, {
      paymentStatus: 'paid',
      fulfilmentStatus: nextFulfilment,
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      paymentVerifiedSource: params.verifiedBy,
      updatedAt: now,
    });

    tx.set(settlementRef, {
      razorpayPaymentId: params.razorpayPaymentId,
      razorpayOrderId: params.razorpayOrderId,
      firestoreOrderId: resolvedOrderId,
      amountPaise: params.verifiedAmountPaise,
      currency: 'INR',
      verifiedBy: params.verifiedBy,
      settledAtIso: nowIso,
      settledAt: now,
    });

    tx.set(
      rzpOrderRef,
      {
        razorpayOrderId: params.razorpayOrderId,
        firestoreOrderId: resolvedOrderId,
        orderNumber,
        customerUid,
        amountPaise: params.verifiedAmountPaise,
        currency: 'INR',
        status: 'paid',
        razorpayPaymentId: params.razorpayPaymentId,
        updatedAt: now,
      },
      { merge: true }
    );

    if (isSafeId(customerUid)) {
      tx.set(notifRef, {
        recipientUid: customerUid,
        title: `Payment Verified for ${orderNumber}`.slice(0, 140),
        body: `Your online payment of ₹${Math.round(
          params.verifiedAmountPaise / 100
        ).toLocaleString('en-IN')} (${params.razorpayPaymentId}) for order ${orderNumber} has been verified and confirmed.`.slice(
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

    if (params.webhookEventId) {
      tx.set(db.collection('payment_webhook_events').doc(params.webhookEventId), {
        eventId: params.webhookEventId,
        eventType: params.webhookEventType || 'payment.captured',
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
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
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      duplicate: false as const,
    };
  });
}

export const razorpayApi = onRequest(
  {
    region: 'asia-south1',
    cors: true,
    secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET],
  },
  async (req, res) => {
    const keyId = (RAZORPAY_KEY_ID.value() || '').trim();
    const keySecret = (RAZORPAY_KEY_SECRET.value() || '').trim();
    const webhookSecret = (RAZORPAY_WEBHOOK_SECRET.value() || '').trim();
    const routePath = (req.path || '/').replace(/\/+$/, '') || '/';

    // 1. GET /config-status or /api/payments/razorpay/config-status
    if (req.method === 'GET' && routePath.endsWith('/config-status')) {
      res.status(200).json({
        ok: true,
        keyMode: !keyId ? 'unconfigured' : keyId.startsWith('rzp_live_') ? 'live' : 'test',
        firestoreDatabaseId: FIRESTORE_DATABASE_ID,
        configured: {
          razorpayKeyId: Boolean(keyId),
          razorpayKeySecret: Boolean(keySecret),
          razorpayWebhookSecret: Boolean(webhookSecret),
          firestoreAdmin: true,
        },
        readyForOrderCreation: Boolean(keyId && keySecret),
        readyForTrustedSettlement: Boolean(keyId && keySecret),
        readyForWebhooks: Boolean(webhookSecret),
      });
      return;
    }

    // 2. POST /create-order or /api/payments/razorpay/create-order
    if (req.method === 'POST' && routePath.endsWith('/create-order')) {
      if (!keyId || !keySecret) {
        res.status(503).json({
          error: 'razorpay_secrets_unconfigured',
          message: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured.',
        });
        return;
      }

      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        res.status(401).json({ error: 'missing_auth_token', message: 'Missing Bearer ID token.' });
        return;
      }

      const { auth, db } = ensureAdmin();
      let decoded;
      try {
        decoded = await auth.verifyIdToken(token);
      } catch {
        res.status(401).json({ error: 'invalid_auth_token', message: 'Invalid Firebase ID token.' });
        return;
      }

      if (!decoded.email_verified) {
        res.status(403).json({ error: 'email_not_verified', message: 'Verified email required.' });
        return;
      }

      const firestoreOrderId = String(req.body?.firestoreOrderId ?? '').trim();
      if (!isSafeId(firestoreOrderId)) {
        res.status(400).json({ error: 'invalid_order_id', message: 'Valid firestoreOrderId required.' });
        return;
      }

      const orderSnap = await db.collection('orders').doc(firestoreOrderId).get();
      if (!orderSnap.exists) {
        res.status(404).json({ error: 'order_not_found', message: 'Firestore order not found.' });
        return;
      }

      const orderData = orderSnap.data() ?? {};
      if (String(orderData.customerUid ?? '') !== decoded.uid) {
        res.status(403).json({ error: 'forbidden', message: 'Not authorized for this order.' });
        return;
      }
      if (orderData.paymentStatus === 'paid') {
        res.status(409).json({ error: 'order_already_paid', message: 'Order is already paid.' });
        return;
      }
      if (orderData.fulfilmentStatus === 'cancelled') {
        res.status(409).json({ error: 'order_cancelled', message: 'Order is cancelled.' });
        return;
      }

      const orderNumber = String(orderData.orderNumber ?? firestoreOrderId);
      const amountPaise = Math.round(Number(orderData.totalAmount ?? 0) * 100);
      if (!Number.isInteger(amountPaise) || amountPaise < 100) {
        res.status(400).json({ error: 'invalid_order_amount', message: 'Amount must be >= ₹1.00.' });
        return;
      }

      const basic = Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64');
      const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: orderNumber.slice(0, 40),
          notes: { firestoreOrderId, orderNumber, customerUid: decoded.uid },
        }),
      });
      const rzpJson = (await rzpResp.json().catch(() => ({}))) as Record<string, unknown>;
      if (!rzpResp.ok || typeof rzpJson.id !== 'string') {
        res.status(502).json({
          error: 'razorpay_create_failed',
          message: 'Failed to create Razorpay order.',
        });
        return;
      }

      const rzpOrderId = String(rzpJson.id);
      const now = FieldValue.serverTimestamp();
      const batch = db.batch();
      batch.set(db.collection('razorpay_orders').doc(rzpOrderId), {
        razorpayOrderId: rzpOrderId,
        firestoreOrderId,
        orderNumber,
        customerUid: decoded.uid,
        amountPaise,
        currency: 'INR',
        status: 'created',
        createdAtIso: new Date().toISOString(),
        createdAt: now,
        updatedAt: now,
      });
      batch.update(db.collection('orders').doc(firestoreOrderId), {
        razorpayOrderId: rzpOrderId,
        updatedAt: now,
      });
      await batch.commit();

      res.status(200).json({
        razorpayOrderId: rzpOrderId,
        amount: Number(rzpJson.amount ?? amountPaise),
        currency: String(rzpJson.currency ?? 'INR'),
        keyId,
        firestoreOrderId,
        orderNumber,
        firestoreAdminActive: true,
      });
      return;
    }

    // 3. POST /verify-payment or /api/payments/razorpay/verify-payment
    if (req.method === 'POST' && routePath.endsWith('/verify-payment')) {
      if (!keyId || !keySecret) {
        res.status(503).json({
          verified: false,
          error: 'razorpay_secrets_unconfigured',
          message: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured.',
        });
        return;
      }

      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        res.status(401).json({ verified: false, error: 'missing_auth_token' });
        return;
      }

      const { auth } = ensureAdmin();
      let decoded;
      try {
        decoded = await auth.verifyIdToken(token);
      } catch {
        res.status(401).json({ verified: false, error: 'invalid_auth_token' });
        return;
      }

      const firestoreOrderId = String(req.body?.firestoreOrderId ?? '').trim();
      const razorpayOrderId = String(req.body?.razorpay_order_id ?? req.body?.razorpayOrderId ?? '').trim();
      const razorpayPaymentId = String(req.body?.razorpay_payment_id ?? req.body?.razorpayPaymentId ?? '').trim();
      const razorpaySignature = String(req.body?.razorpay_signature ?? req.body?.razorpaySignature ?? '').trim();

      if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret)) {
        res.status(400).json({
          verified: false,
          error: 'invalid_payment_signature',
          message: 'Razorpay payment signature verification failed.',
        });
        return;
      }

      const basic = Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64');
      const payResp = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`,
        { headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' } }
      );
      const payJson = (await payResp.json().catch(() => ({}))) as Record<string, unknown>;
      if (!payResp.ok || typeof payJson.id !== 'string') {
        res.status(502).json({
          verified: false,
          error: 'razorpay_lookup_failed',
          message: 'Failed to inspect payment status from Razorpay API.',
        });
        return;
      }

      if (String(payJson.order_id ?? '') !== razorpayOrderId) {
        res.status(400).json({ verified: false, error: 'payment_order_mismatch' });
        return;
      }

      if (String(payJson.status ?? '') !== 'captured') {
        res.status(202).json({
          verified: false,
          paymentGatewayStatus: String(payJson.status ?? ''),
          error: 'payment_not_yet_captured',
          message: 'Signature valid, awaiting capture webhook.',
        });
        return;
      }

      const outcome = await settleOrderInFirestore({
        firestoreOrderId,
        razorpayOrderId,
        razorpayPaymentId,
        verifiedAmountPaise: Number(payJson.amount ?? 0),
        verifiedCurrency: String(payJson.currency ?? ''),
        verifiedBy: 'razorpay_signature_verify',
        expectedCustomerUid: decoded.uid,
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

      res.status(outcome.status === 'ownership_mismatch' ? 403 : 400).json({
        verified: false,
        error: outcome.status,
        message: 'message' in outcome ? outcome.message : 'Unable to settle order.',
      });
      return;
    }

    // 4. POST /webhook or /api/payments/razorpay/webhook
    if (req.method === 'POST' && routePath.endsWith('/webhook')) {
      if (!webhookSecret) {
        res.status(503).json({ received: false, error: 'webhook_secret_unconfigured' });
        return;
      }

      const rawBody = req.rawBody;
      const signatureHeader = String(req.headers['x-razorpay-signature'] ?? '');
      if (!Buffer.isBuffer(rawBody) || !signatureHeader) {
        res.status(400).json({ received: false, error: 'missing_raw_body_or_signature' });
        return;
      }

      if (!verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
        res.status(401).json({ received: false, error: 'invalid_webhook_signature' });
        return;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
      } catch {
        res.status(400).json({ received: false, error: 'malformed_json' });
        return;
      }

      const eventId = deriveEventId(
        typeof req.headers['x-razorpay-event-id'] === 'string'
          ? req.headers['x-razorpay-event-id']
          : undefined,
        rawBody
      );
      const eventType = String(parsed.event ?? 'unknown');
      const payloadRoot = (parsed.payload as Record<string, unknown> | undefined) ?? {};
      const paymentEntity =
        ((payloadRoot.payment as Record<string, unknown> | undefined)?.entity as
          | Record<string, unknown>
          | undefined) ?? {};
      const orderEntity =
        ((payloadRoot.order as Record<string, unknown> | undefined)?.entity as
          | Record<string, unknown>
          | undefined) ?? {};
      const paymentNotes = (paymentEntity.notes as Record<string, unknown> | undefined) ?? {};
      const orderNotes = (orderEntity.notes as Record<string, unknown> | undefined) ?? {};

      const razorpayPaymentId = String(paymentEntity.id ?? '').trim();
      const razorpayOrderId = String(paymentEntity.order_id ?? orderEntity.id ?? '').trim();
      const firestoreOrderIdHint = String(
        paymentNotes.firestoreOrderId ?? orderNotes.firestoreOrderId ?? ''
      ).trim();

      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        if (
          !isSafeId(razorpayOrderId) ||
          !isSafeId(razorpayPaymentId) ||
          String(paymentEntity.status ?? '') !== 'captured'
        ) {
          res.status(400).json({ received: false, error: 'invalid_capture_entity' });
          return;
        }

        const outcome = await settleOrderInFirestore({
          firestoreOrderId: isSafeId(firestoreOrderIdHint) ? firestoreOrderIdHint : undefined,
          razorpayOrderId,
          razorpayPaymentId,
          verifiedAmountPaise: Number(paymentEntity.amount ?? orderEntity.amount_paid ?? 0),
          verifiedCurrency: String(paymentEntity.currency ?? orderEntity.currency ?? ''),
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
          message: 'message' in outcome ? outcome.message : 'Settlement validation failed.',
        });
        return;
      }

      // Deduplicate and record payment.failed or other webhook events without marking paid
      const { db } = ensureAdmin();
      const auditResult = await db.runTransaction(async (tx) => {
        const ref = db.collection('payment_webhook_events').doc(eventId);
        const snap = await tx.get(ref);
        if (snap.exists) return { duplicate: true };
        tx.set(ref, {
          eventId,
          eventType: eventType.slice(0, 64),
          razorpayOrderId: razorpayOrderId.slice(0, 64),
          razorpayPaymentId: razorpayPaymentId.slice(0, 64),
          firestoreOrderId: firestoreOrderIdHint.slice(0, 128),
          outcome: eventType === 'payment.failed' ? 'payment_failed_recorded' : 'ignored',
          processedAtIso: new Date().toISOString(),
          processedAt: FieldValue.serverTimestamp(),
        });
        return { duplicate: false };
      });

      res.status(200).json({
        received: true,
        eventId,
        eventType,
        outcome: eventType === 'payment.failed' ? 'payment_failed_recorded' : 'ignored',
        duplicate: auditResult.duplicate,
      });
      return;
    }

    res.status(404).json({ error: 'not_found', message: `Unknown route ${req.method} ${routePath}` });
  }
);
