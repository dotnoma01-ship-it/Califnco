export interface RazorpayBackendConfigStatus {
  ok: boolean;
  keyMode: 'test' | 'live' | 'unconfigured';
  projectId?: string;
  firestoreDatabaseId?: string;
  configured: {
    razorpayKeyId: boolean;
    razorpayKeySecret: boolean;
    razorpayWebhookSecret: boolean;
    firestoreAdmin: boolean;
  };
  readyForOrderCreation: boolean;
  readyForTrustedSettlement: boolean;
  readyForWebhooks: boolean;
}

export interface CreateRazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  firestoreOrderId: string;
  orderNumber: string;
  firestoreAdminActive: boolean;
}

export interface RazorpayCheckoutSuccessPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyRazorpayPaymentResponse {
  verified: boolean;
  duplicate?: boolean;
  firestoreOrderId?: string;
  orderNumber?: string;
  paymentStatus?: string;
  fulfilmentStatus?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentGatewayStatus?: string;
  error?: string;
  message?: string;
}

interface RazorpayWindowInstance {
  open(): void;
  on(
    event: 'payment.failed',
    handler: (resp: { error?: { code?: string; description?: string; reason?: string } }) => void
  ): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayWindowInstance;
  }
}

/**
 * Resolves the payment backend base URL:
 * - Uses VITE_PAYMENT_API_BASE_URL when explicitly set (e.g., deployed Firebase Cloud Functions URL
 *   for Vercel static builds or external hosting).
 * - Defaults to same-origin '/api/payments/razorpay' on the full-stack server.
 */
export function getRazorpayApiEndpoint(
  action: 'config-status' | 'create-order' | 'verify-payment' | 'webhook'
): string {
  const configuredBase = String(import.meta.env.VITE_PAYMENT_API_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');

  if (!configuredBase) {
    return `/api/payments/razorpay/${action}`;
  }

  if (configuredBase.endsWith('/api/payments/razorpay')) {
    return `${configuredBase}/${action}`;
  }

  return `${configuredBase}/api/payments/razorpay/${action}`;
}

export async function fetchRazorpayBackendStatus(): Promise<RazorpayBackendConfigStatus | null> {
  try {
    const resp = await fetch(getRazorpayApiEndpoint('config-status'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return (await resp.json()) as RazorpayBackendConfigStatus;
  } catch {
    return null;
  }
}

export async function createBackendRazorpayOrder(params: {
  firestoreOrderId: string;
  idToken: string;
}): Promise<CreateRazorpayOrderResponse> {
  const resp = await fetch(getRazorpayApiEndpoint('create-order'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.idToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ firestoreOrderId: params.firestoreOrderId }),
  });

  const json = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok || typeof json.razorpayOrderId !== 'string') {
    throw new Error(
      typeof json.message === 'string'
        ? json.message
        : `Backend order creation failed (HTTP ${resp.status}).`
    );
  }

  return {
    razorpayOrderId: String(json.razorpayOrderId),
    amount: Number(json.amount ?? 0),
    currency: String(json.currency ?? 'INR'),
    keyId: String(json.keyId ?? ''),
    firestoreOrderId: String(json.firestoreOrderId ?? params.firestoreOrderId),
    orderNumber: String(json.orderNumber ?? ''),
    firestoreAdminActive: Boolean(json.firestoreAdminActive),
  };
}

export async function verifyBackendRazorpayPayment(params: {
  firestoreOrderId: string;
  idToken: string;
  checkoutPayload: RazorpayCheckoutSuccessPayload;
}): Promise<VerifyRazorpayPaymentResponse> {
  const resp = await fetch(getRazorpayApiEndpoint('verify-payment'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.idToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      firestoreOrderId: params.firestoreOrderId,
      razorpay_order_id: params.checkoutPayload.razorpay_order_id,
      razorpay_payment_id: params.checkoutPayload.razorpay_payment_id,
      razorpay_signature: params.checkoutPayload.razorpay_signature,
    }),
  });

  const json = (await resp.json().catch(() => ({}))) as VerifyRazorpayPaymentResponse;
  if (!resp.ok && resp.status !== 202) {
    return {
      verified: false,
      error: json.error || `http_${resp.status}`,
      message: json.message || `Server payment verification rejected (HTTP ${resp.status}).`,
    };
  }
  return json;
}

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (typeof window.Razorpay === 'function') return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(typeof window.Razorpay === 'function');
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
}

export async function launchRazorpayCheckoutModal(params: {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): Promise<
  | { outcome: 'completed'; payload: RazorpayCheckoutSuccessPayload }
  | { outcome: 'dismissed' }
  | { outcome: 'failed'; message: string }
> {
  const loaded = await loadRazorpayCheckoutScript();
  if (!loaded || typeof window.Razorpay !== 'function') {
    return {
      outcome: 'failed',
      message:
        'Unable to load Razorpay Checkout SDK (checkout.razorpay.com). Order remains pending and unverified.',
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (
      result:
        | { outcome: 'completed'; payload: RazorpayCheckoutSuccessPayload }
        | { outcome: 'dismissed' }
        | { outcome: 'failed'; message: string }
    ) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const RazorpayCtor = window.Razorpay!;
    const instance = new RazorpayCtor({
      key: params.keyId,
      amount: params.amountPaise,
      currency: params.currency,
      name: 'Califnco Water Systems',
      description: `Order #${params.orderNumber}`,
      order_id: params.razorpayOrderId,
      prefill: {
        name: params.customerName,
        email: params.customerEmail,
        contact: params.customerPhone,
      },
      theme: {
        color: '#0A2540',
      },
      modal: {
        ondismiss: () => finish({ outcome: 'dismissed' }),
      },
      handler: (response: Record<string, unknown>) => {
        // IMPORTANT: Frontend callback alone NEVER marks an order as paid.
        // We return the raw gateway tuple so the caller submits it to POST /verify-payment.
        finish({
          outcome: 'completed',
          payload: {
            razorpay_order_id: String(response.razorpay_order_id ?? ''),
            razorpay_payment_id: String(response.razorpay_payment_id ?? ''),
            razorpay_signature: String(response.razorpay_signature ?? ''),
          },
        });
      },
    });

    instance.on('payment.failed', (resp) => {
      const desc =
        resp?.error?.description ||
        resp?.error?.reason ||
        'Payment failed at Razorpay gateway. Order remains pending.';
      finish({ outcome: 'failed', message: desc });
    });

    instance.open();
  });
}
