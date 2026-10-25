import crypto from 'node:crypto';
import express, { type Request } from 'express';
import { describe, expect, it } from 'vitest';
import {
  createRazorpayHttpHandlers,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  type PaymentStoreAdapter,
  type RazorpayGatewayClient,
  type RazorpayOrderBindingInput,
  type RazorpayRuntimeSecrets,
  type StoredOrderSnapshot,
} from './razorpayCore';

const TEST_SECRETS: RazorpayRuntimeSecrets = {
  razorpayKeyId: 'rzp_test_unit_key_001',
  razorpayKeySecret: 'unit_test_razorpay_key_secret_998877',
  razorpayWebhookSecret: 'unit_test_webhook_hmac_secret_112233',
  firebaseProjectId: 'gen-lang-client-0877500010',
  firestoreDatabaseId: 'ai-studio-califnco-446b2980-82d0-4b7d-a0e2-2bbecc22b94c',
};

function createInMemoryPaymentStore(initialOrders: StoredOrderSnapshot[]) {
  const orders = new Map<string, StoredOrderSnapshot>(
    initialOrders.map((o) => [o.id, { ...o }])
  );
  const bindings = new Map<string, RazorpayOrderBindingInput>();
  const settlements = new Map<string, { razorpayOrderId: string; firestoreOrderId: string }>();
  const webhookEvents = new Set<string>();
  let settlementWriteCount = 0;

  const store: PaymentStoreAdapter = {
    hasAdminWriteAccess: true,

    async getOrderForCheckout(firestoreOrderId) {
      return orders.get(firestoreOrderId) ?? null;
    },

    async saveRazorpayOrderBinding(binding) {
      bindings.set(binding.razorpayOrderId, binding);
      const ord = orders.get(binding.firestoreOrderId);
      if (ord) {
        ord.razorpayOrderId = binding.razorpayOrderId;
      }
    },

    async settleOrderPaymentAtomically(params) {
      if (params.webhookEventId && webhookEvents.has(params.webhookEventId)) {
        return { status: 'duplicate_webhook_event', duplicate: true };
      }

      const resolvedOrderId =
        params.firestoreOrderId || bindings.get(params.razorpayOrderId)?.firestoreOrderId || '';
      const ord = orders.get(resolvedOrderId);
      if (!ord) {
        return { status: 'order_not_found', message: 'Order not found' };
      }
      if (params.expectedCustomerUid && ord.customerUid !== params.expectedCustomerUid) {
        return { status: 'ownership_mismatch', message: 'Wrong user' };
      }
      if (ord.razorpayOrderId && ord.razorpayOrderId !== params.razorpayOrderId) {
        return { status: 'order_id_mismatch', message: 'Order ID mismatch' };
      }
      const expectedPaise = Math.round(ord.totalAmount * 100);
      if (params.verifiedCurrency !== 'INR' || params.verifiedAmountPaise !== expectedPaise) {
        return { status: 'amount_mismatch', message: 'Amount mismatch' };
      }
      if (ord.fulfilmentStatus === 'cancelled') {
        return { status: 'order_cancelled', message: 'Order cancelled' };
      }

      if (settlements.has(params.razorpayPaymentId) || ord.paymentStatus === 'paid') {
        if (params.webhookEventId) {
          webhookEvents.add(params.webhookEventId);
        }
        return {
          status: 'already_settled',
          firestoreOrderId: ord.id,
          orderNumber: ord.orderNumber,
          paymentStatus: 'paid',
          fulfilmentStatus: ord.fulfilmentStatus,
          razorpayOrderId: params.razorpayOrderId,
          razorpayPaymentId: ord.razorpayPaymentId || params.razorpayPaymentId,
          duplicate: true,
        };
      }

      ord.paymentStatus = 'paid';
      ord.fulfilmentStatus = ord.fulfilmentStatus === 'pending' ? 'confirmed' : ord.fulfilmentStatus;
      ord.razorpayOrderId = params.razorpayOrderId;
      ord.razorpayPaymentId = params.razorpayPaymentId;
      settlements.set(params.razorpayPaymentId, {
        razorpayOrderId: params.razorpayOrderId,
        firestoreOrderId: ord.id,
      });
      if (params.webhookEventId) {
        webhookEvents.add(params.webhookEventId);
      }
      settlementWriteCount += 1;

      return {
        status: 'settled',
        firestoreOrderId: ord.id,
        orderNumber: ord.orderNumber,
        paymentStatus: 'paid',
        fulfilmentStatus: ord.fulfilmentStatus,
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        duplicate: false,
      };
    },

    async recordWebhookAuditEventAtomically(params) {
      if (webhookEvents.has(params.eventId)) {
        return { duplicate: true };
      }
      webhookEvents.add(params.eventId);
      return { duplicate: false };
    },
  };

  return {
    store,
    orders,
    getSettlementWriteCount: () => settlementWriteCount,
  };
}

function buildTestServer(params: {
  secrets?: RazorpayRuntimeSecrets;
  store: PaymentStoreAdapter;
  gateway: RazorpayGatewayClient;
}) {
  const app = express();
  const handlers = createRazorpayHttpHandlers({
    getSecrets: () => params.secrets ?? TEST_SECRETS,
    verifyBearerToken: async (token) => {
      if (token === 'valid_token_user_sarah') {
        return { uid: 'user_sarah', email: 'sarah@example.com', emailVerified: true };
      }
      if (token === 'valid_token_other_user') {
        return { uid: 'user_intruder', email: 'other@example.com', emailVerified: true };
      }
      throw new Error('Invalid token');
    },
    getStore: () => params.store,
    gateway: params.gateway,
  });

  app.post(
    '/api/payments/razorpay/webhook',
    express.raw({ type: '*/*' }),
    (req: Request & { rawBody?: Buffer }, res) => {
      if (Buffer.isBuffer(req.body)) req.rawBody = req.body;
      return handlers.handleWebhook(req, res);
    }
  );
  app.use(express.json());
  app.get('/api/payments/razorpay/config-status', handlers.configStatus);
  app.post('/api/payments/razorpay/create-order', (req, res) => handlers.createOrder(req, res));
  app.post('/api/payments/razorpay/verify-payment', (req, res) => handlers.verifyPayment(req, res));
  return app;
}

describe('Califnco Razorpay Backend Security & Idempotency Suite', () => {
  it('verifies HMAC-SHA256 payment and raw-body webhook signatures with timing-safe equality', () => {
    const orderId = 'order_Rzp987654';
    const paymentId = 'pay_Rzp123456';
    const validPaySig = crypto
      .createHmac('sha256', TEST_SECRETS.razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validPaySig,
        keySecret: TEST_SECRETS.razorpayKeySecret,
      })
    ).toBe(true);

    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validPaySig.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')),
        keySecret: TEST_SECRETS.razorpayKeySecret,
      })
    ).toBe(false);

    const rawWebhookPayload = Buffer.from(
      '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1"}}}}',
      'utf8'
    );
    const validWebhookSig = crypto
      .createHmac('sha256', TEST_SECRETS.razorpayWebhookSecret)
      .update(rawWebhookPayload)
      .digest('hex');

    expect(
      verifyRazorpayWebhookSignature({
        rawBody: rawWebhookPayload,
        signatureHeader: validWebhookSig,
        webhookSecret: TEST_SECRETS.razorpayWebhookSecret,
      })
    ).toBe(true);

    // Mutating even whitespace in raw body invalidates HMAC
    expect(
      verifyRazorpayWebhookSignature({
        rawBody: Buffer.from(`${rawWebhookPayload.toString('utf8')} `, 'utf8'),
        signatureHeader: validWebhookSig,
        webhookSecret: TEST_SECRETS.razorpayWebhookSecret,
      })
    ).toBe(false);
  });

  it('creates Razorpay order from server-side Firestore total, rejects forged signatures, settles valid captured payment, and deduplicates webhook', async () => {
    const { store, orders, getSettlementWriteCount } = createInMemoryPaymentStore([
      {
        id: 'ord-55001',
        orderNumber: 'CALIF-55001',
        customerUid: 'user_sarah',
        totalAmount: 17499,
        paymentStatus: 'razorpay_pending',
        fulfilmentStatus: 'pending',
      },
    ]);

    let gatewayPaymentStatus = 'captured';
    const gateway: RazorpayGatewayClient = {
      async createOrder({ amountPaise, currency, receipt }) {
        return {
          id: 'order_TestCalif55001',
          amount: amountPaise,
          currency,
          status: 'created',
          receipt,
        };
      },
      async fetchPayment({ paymentId }) {
        return {
          id: paymentId,
          order_id: 'order_TestCalif55001',
          amount: 1749900,
          currency: 'INR',
          status: gatewayPaymentStatus,
        };
      },
    };

    const app = buildTestServer({ store, gateway });
    const server = app.listen(0);
    const addr = server.address();
    const baseUrl = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;

    try {
      // 1. Intruder cannot create Razorpay order for Sarah's order
      const forbiddenResp = await fetch(`${baseUrl}/api/payments/razorpay/create-order`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token_other_user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firestoreOrderId: 'ord-55001' }),
      });
      expect(forbiddenResp.status).toBe(403);

      // 2. Owner creates Razorpay order -> amount computed strictly from Firestore (17499 * 100 paise)
      const createResp = await fetch(`${baseUrl}/api/payments/razorpay/create-order`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token_user_sarah',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firestoreOrderId: 'ord-55001' }),
      });
      expect(createResp.status).toBe(200);
      const createJson = (await createResp.json()) as {
        razorpayOrderId: string;
        amount: number;
      };
      expect(createJson.razorpayOrderId).toBe('order_TestCalif55001');
      expect(createJson.amount).toBe(1749900);
      expect(orders.get('ord-55001')?.paymentStatus).toBe('razorpay_pending');

      // 3. Forged payment signature is rejected and order stays razorpay_pending
      const forgedResp = await fetch(`${baseUrl}/api/payments/razorpay/verify-payment`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token_user_sarah',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firestoreOrderId: 'ord-55001',
          razorpay_order_id: 'order_TestCalif55001',
          razorpay_payment_id: 'pay_LiveCapture001',
          razorpay_signature: 'a'.repeat(64),
        }),
      });
      expect(forgedResp.status).toBe(400);
      expect(orders.get('ord-55001')?.paymentStatus).toBe('razorpay_pending');

      // 4. Valid signature with uncaptured ('authorized') status returns 202 and keeps order pending
      gatewayPaymentStatus = 'authorized';
      const validPaySig = crypto
        .createHmac('sha256', TEST_SECRETS.razorpayKeySecret)
        .update('order_TestCalif55001|pay_LiveCapture001')
        .digest('hex');

      const authorizedResp = await fetch(`${baseUrl}/api/payments/razorpay/verify-payment`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token_user_sarah',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firestoreOrderId: 'ord-55001',
          razorpay_order_id: 'order_TestCalif55001',
          razorpay_payment_id: 'pay_LiveCapture001',
          razorpay_signature: validPaySig,
        }),
      });
      expect(authorizedResp.status).toBe(202);
      expect(orders.get('ord-55001')?.paymentStatus).toBe('razorpay_pending');

      // 5. Captured payment settles Firestore order to 'paid' + 'confirmed'
      gatewayPaymentStatus = 'captured';
      const verifyResp = await fetch(`${baseUrl}/api/payments/razorpay/verify-payment`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid_token_user_sarah',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firestoreOrderId: 'ord-55001',
          razorpay_order_id: 'order_TestCalif55001',
          razorpay_payment_id: 'pay_LiveCapture001',
          razorpay_signature: validPaySig,
        }),
      });
      expect(verifyResp.status).toBe(200);
      const verifyJson = (await verifyResp.json()) as { verified: boolean; duplicate: boolean };
      expect(verifyJson.verified).toBe(true);
      expect(verifyJson.duplicate).toBe(false);
      expect(orders.get('ord-55001')?.paymentStatus).toBe('paid');
      expect(orders.get('ord-55001')?.fulfilmentStatus).toBe('confirmed');
      expect(getSettlementWriteCount()).toBe(1);

      // 6. Subsequent payment.captured webhook for the same payment is idempotent (no double settlement)
      const webhookRaw = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_LiveCapture001',
              order_id: 'order_TestCalif55001',
              amount: 1749900,
              currency: 'INR',
              status: 'captured',
              notes: { firestoreOrderId: 'ord-55001' },
            },
          },
        },
      });
      const webhookSig = crypto
        .createHmac('sha256', TEST_SECRETS.razorpayWebhookSecret)
        .update(Buffer.from(webhookRaw, 'utf8'))
        .digest('hex');

      const webhookResp1 = await fetch(`${baseUrl}/api/payments/razorpay/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Signature': webhookSig,
          'X-Razorpay-Event-Id': 'evt_razorpay_delivery_001',
        },
        body: webhookRaw,
      });
      expect(webhookResp1.status).toBe(200);
      const webhookJson1 = (await webhookResp1.json()) as { outcome: string; duplicate: boolean };
      expect(webhookJson1.outcome).toBe('already_settled');
      expect(webhookJson1.duplicate).toBe(true);
      expect(getSettlementWriteCount()).toBe(1);

      // 7. Replaying exact same webhook event ID hits event-level deduplication immediately
      const webhookResp2 = await fetch(`${baseUrl}/api/payments/razorpay/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Signature': webhookSig,
          'X-Razorpay-Event-Id': 'evt_razorpay_delivery_001',
        },
        body: webhookRaw,
      });
      expect(webhookResp2.status).toBe(200);
      const webhookJson2 = (await webhookResp2.json()) as { outcome: string; duplicate: boolean };
      expect(webhookJson2.outcome).toBe('duplicate_webhook_event');
      expect(webhookJson2.duplicate).toBe(true);
      expect(getSettlementWriteCount()).toBe(1);
    } finally {
      server.close();
    }
  });
});
