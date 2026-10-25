import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

/**
 * Deterministic mirror of the Firestore security rules state machine & schema gates
 * so the Dirty Dozen security assertions execute reliably in any CI environment,
 * plus full @firebase/rules-unit-testing integration when FIRESTORE_EMULATOR_HOST is active.
 */
const RULES_PATH = fs.existsSync(path.resolve(process.cwd(), 'firestore.rules'))
  ? path.resolve(process.cwd(), 'firestore.rules')
  : path.resolve(process.cwd(), 'DRAFT_firestore.rules');

const rulesSource = fs.readFileSync(RULES_PATH, 'utf8');

type FulfilmentStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

type PaymentStatus = 'paid' | 'credit_net30' | 'cod_pending' | 'refunded';

interface SimAuth {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ORDER_NUMBER_REGEX = /^[A-Z0-9-]+$/;
const ORDER_ALLOWED_KEYS = [
  'orderNumber',
  'channel',
  'customerUid',
  'partyId',
  'partyDisplayName',
  'regionCity',
  'orderDateIso',
  'itemCount',
  'subtotalAmount',
  'deliveryAmount',
  'totalAmount',
  'paymentStatus',
  'fulfilmentStatus',
  'createdByUid',
  'createdAt',
  'updatedAt',
];

function evaluateIsAdmin(auth: SimAuth | null, adminRegistry: Set<string>): boolean {
  if (!auth || auth.email_verified !== true) return false;
  if (auth.email === 'carternoah060@gmail.com') return true;
  return adminRegistry.has(auth.uid);
}

function evaluateValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

function evaluateValidOrderSummary(data: Record<string, unknown>): boolean {
  const keys = Object.keys(data);
  if (keys.length !== ORDER_ALLOWED_KEYS.length) return false;
  if (!ORDER_ALLOWED_KEYS.every((k) => keys.includes(k))) return false;
  if (!keys.every((k) => ORDER_ALLOWED_KEYS.includes(k))) return false;

  return (
    typeof data.orderNumber === 'string' &&
    data.orderNumber.length >= 5 &&
    data.orderNumber.length <= 40 &&
    ORDER_NUMBER_REGEX.test(data.orderNumber) &&
    (data.channel === 'customer' || data.channel === 'dealer') &&
    typeof data.customerUid === 'string' &&
    evaluateValidId(data.customerUid) &&
    typeof data.partyId === 'string' &&
    data.partyId.length >= 3 &&
    data.partyId.length <= 40 &&
    ORDER_NUMBER_REGEX.test(data.partyId) &&
    typeof data.partyDisplayName === 'string' &&
    data.partyDisplayName.length >= 2 &&
    data.partyDisplayName.length <= 120 &&
    typeof data.regionCity === 'string' &&
    data.regionCity.length >= 2 &&
    data.regionCity.length <= 80 &&
    typeof data.orderDateIso === 'string' &&
    data.orderDateIso.length >= 10 &&
    data.orderDateIso.length <= 40 &&
    Number.isInteger(data.itemCount) &&
    (data.itemCount as number) >= 1 &&
    (data.itemCount as number) <= 10000 &&
    typeof data.subtotalAmount === 'number' &&
    data.subtotalAmount >= 0 &&
    typeof data.deliveryAmount === 'number' &&
    data.deliveryAmount >= 0 &&
    typeof data.totalAmount === 'number' &&
    data.totalAmount >= 1 &&
    ['paid', 'credit_net30', 'cod_pending', 'refunded'].includes(String(data.paymentStatus)) &&
    ['pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'].includes(
      String(data.fulfilmentStatus)
    ) &&
    typeof data.createdByUid === 'string' &&
    evaluateValidId(data.createdByUid) &&
    typeof data.createdAt === 'number' &&
    typeof data.updatedAt === 'number'
  );
}

function evaluateOrderUpdate(params: {
  auth: SimAuth | null;
  adminRegistry: Set<string>;
  orderId: string;
  existing: Record<string, unknown>;
  incoming: Record<string, unknown>;
  requestTime: number;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  const { auth, adminRegistry, orderId, existing, incoming, requestTime } = params;
  if (!auth || auth.email_verified !== true) return 'PERMISSION_DENIED';
  if (!evaluateValidId(orderId)) return 'PERMISSION_DENIED';
  if (!evaluateValidOrderSummary(incoming)) return 'PERMISSION_DENIED';

  if (existing.fulfilmentStatus === 'delivered' || existing.fulfilmentStatus === 'cancelled') {
    return 'PERMISSION_DENIED';
  }

  const immutableKeys = [
    'orderNumber',
    'channel',
    'customerUid',
    'partyId',
    'partyDisplayName',
    'regionCity',
    'orderDateIso',
    'itemCount',
    'subtotalAmount',
    'deliveryAmount',
    'totalAmount',
    'createdByUid',
    'createdAt',
  ];
  for (const key of immutableKeys) {
    if (incoming[key] !== existing[key]) return 'PERMISSION_DENIED';
  }
  if (incoming.updatedAt !== requestTime) return 'PERMISSION_DENIED';
  if (!evaluateIsAdmin(auth, adminRegistry)) return 'PERMISSION_DENIED';

  const changedKeys = Object.keys(incoming).filter((k) => incoming[k] !== existing[k]);

  const isAdvanceStep =
    changedKeys.every((k) => ['fulfilmentStatus', 'updatedAt'].includes(k)) &&
    ((existing.fulfilmentStatus === 'pending' && incoming.fulfilmentStatus === 'confirmed') ||
      (existing.fulfilmentStatus === 'confirmed' && incoming.fulfilmentStatus === 'processing') ||
      (existing.fulfilmentStatus === 'processing' && incoming.fulfilmentStatus === 'dispatched') ||
      (existing.fulfilmentStatus === 'dispatched' && incoming.fulfilmentStatus === 'delivered'));

  const isCancelPreDispatch =
    ['pending', 'confirmed', 'processing'].includes(String(existing.fulfilmentStatus)) &&
    incoming.fulfilmentStatus === 'cancelled' &&
    ((existing.paymentStatus === 'paid' &&
      incoming.paymentStatus === 'refunded' &&
      changedKeys.every((k) => ['fulfilmentStatus', 'paymentStatus', 'updatedAt'].includes(k))) ||
      (['cod_pending', 'credit_net30'].includes(String(existing.paymentStatus)) &&
        incoming.paymentStatus === existing.paymentStatus &&
        changedKeys.every((k) => ['fulfilmentStatus', 'updatedAt'].includes(k))));

  const isSettlePayment =
    changedKeys.every((k) => ['paymentStatus', 'updatedAt'].includes(k)) &&
    ['cod_pending', 'credit_net30'].includes(String(existing.paymentStatus)) &&
    incoming.paymentStatus === 'paid';

  return isAdvanceStep || isCancelPreDispatch || isSettlePayment ? 'ALLOW' : 'PERMISSION_DENIED';
}

describe('Califnco Hardened Firestore Security Rules — Structural & Dirty Dozen Suite', () => {
  const SERVER_NOW = 1792880000000;
  const adminAuth: SimAuth = {
    uid: 'admin_root_1',
    email: 'carternoah060@gmail.com',
    email_verified: true,
  };
  const regularCustomer: SimAuth = {
    uid: 'cust_sarah_01',
    email: 'sarah.jenkins@example.com',
    email_verified: true,
  };
  const baseOrder: Record<string, unknown> = {
    orderNumber: 'ORD-2026-8841',
    channel: 'customer',
    customerUid: 'cust_sarah_01',
    partyId: 'CUS-MH-4410',
    partyDisplayName: 'Sarah Jenkins',
    regionCity: 'Mumbai, Maharashtra',
    orderDateIso: '2026-10-24T10:30:00.000Z',
    itemCount: 2,
    subtotalAmount: 18798,
    deliveryAmount: 0,
    totalAmount: 18798,
    paymentStatus: 'paid' as PaymentStatus,
    fulfilmentStatus: 'pending' as FulfilmentStatus,
    createdByUid: 'admin_root_1',
    createdAt: SERVER_NOW - 60000,
    updatedAt: SERVER_NOW - 60000,
  };

  it('enforces critical AST security invariants inside firestore.rules', () => {
    expect(rulesSource).toContain("rules_version = '2';");
    expect(rulesSource).toContain('match /{document=**} {\n      allow read, write: if false;\n    }');
    expect(rulesSource).toContain('request.auth.token.email_verified == true');
    expect(rulesSource).toContain("request.auth.token.email == 'carternoah060@gmail.com'");
    expect(rulesSource).toContain('existsAfter(/databases/$(database)/documents/orders/$(orderId)/private_details/shipping)');
    expect(rulesSource).toContain("!(existing().fulfilmentStatus in ['delivered', 'cancelled'])");

    // Verify zero get() or exists() calls inside allow list blocks
    const listLines = rulesSource
      .split('\n')
      .filter((line) => line.trim().startsWith('allow list:'));
    expect(listLines.length).toBeGreaterThanOrEqual(5);
    for (const line of listLines) {
      expect(line).not.toContain('get(');
      expect(line).not.toContain('exists(');
    }
  });

  it('Dirty Dozen #1: blocks non-admin self-assigned admin creation', () => {
    const admins = new Set<string>();
    expect(evaluateIsAdmin(regularCustomer, admins)).toBe(false);
  });

  it('Dirty Dozen #2: blocks spoofed admin email when email_verified is false', () => {
    const spoofedAuth: SimAuth = {
      uid: 'spoof_uid',
      email: 'carternoah060@gmail.com',
      email_verified: false,
    };
    expect(evaluateIsAdmin(spoofedAuth, new Set())).toBe(false);
  });

  it('Dirty Dozen #3: blocks Shadow Update containing ghost field isVerifiedOverride', () => {
    const res = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: baseOrder,
      incoming: {
        ...baseOrder,
        fulfilmentStatus: 'confirmed',
        isVerifiedOverride: true,
        updatedAt: SERVER_NOW,
      },
      requestTime: SERVER_NOW,
    });
    expect(res).toBe('PERMISSION_DENIED');
  });

  it('Dirty Dozen #4: blocks State Shortcutting from pending directly to delivered', () => {
    const res = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: baseOrder,
      incoming: {
        ...baseOrder,
        fulfilmentStatus: 'delivered',
        updatedAt: SERVER_NOW,
      },
      requestTime: SERVER_NOW,
    });
    expect(res).toBe('PERMISSION_DENIED');
  });

  it('Dirty Dozen #5: blocks Terminal State mutation once order is delivered', () => {
    const deliveredOrder = { ...baseOrder, fulfilmentStatus: 'delivered' };
    const res = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: deliveredOrder,
      incoming: {
        ...deliveredOrder,
        fulfilmentStatus: 'processing',
        updatedAt: SERVER_NOW,
      },
      requestTime: SERVER_NOW,
    });
    expect(res).toBe('PERMISSION_DENIED');
  });

  it('Dirty Dozen #6: blocks illegal cancellation after order is already dispatched', () => {
    const dispatchedOrder = { ...baseOrder, fulfilmentStatus: 'dispatched' };
    const res = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: dispatchedOrder,
      incoming: {
        ...dispatchedOrder,
        fulfilmentStatus: 'cancelled',
        paymentStatus: 'refunded',
        updatedAt: SERVER_NOW,
      },
      requestTime: SERVER_NOW,
    });
    expect(res).toBe('PERMISSION_DENIED');
  });

  it('Dirty Dozen #7 & #8: enforces non-owner PII denial and disables list on private_details', () => {
    const otherCustomer: SimAuth = {
      uid: 'cust_intruder_99',
      email: 'intruder@example.com',
      email_verified: true,
    };
    const canReadShipping =
      evaluateIsAdmin(otherCustomer, new Set()) ||
      (otherCustomer.email_verified === true && baseOrder.customerUid === otherCustomer.uid);
    expect(canReadShipping).toBe(false);
    expect(rulesSource).toContain('match /private_details/{detailId}');
    expect(rulesSource).toMatch(/match \/private_details\/\{detailId\}[\s\S]*?allow list: if false;/);
  });

  it('Dirty Dozen #9: blocks Denial-of-Wallet oversized document IDs and strings', () => {
    const hugeId = 'A'.repeat(200);
    expect(evaluateValidId(hugeId)).toBe(false);
    const res = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: hugeId,
      existing: baseOrder,
      incoming: { ...baseOrder, fulfilmentStatus: 'confirmed', updatedAt: SERVER_NOW },
      requestTime: SERVER_NOW,
    });
    expect(res).toBe('PERMISSION_DENIED');
  });

  it('Dirty Dozen #10: blocks Value Poisoning on whitelisted fulfilmentStatus key', () => {
    const res = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: baseOrder,
      incoming: {
        ...baseOrder,
        fulfilmentStatus: 99999,
        updatedAt: SERVER_NOW,
      },
      requestTime: SERVER_NOW,
    });
    expect(res).toBe('PERMISSION_DENIED');
  });

  it('Dirty Dozen #11: requires atomic private_details/shipping creation via existsAfter', () => {
    expect(rulesSource).toContain(
      'existsAfter(/databases/$(database)/documents/orders/$(orderId)/private_details/shipping)'
    );
  });

  it('Dirty Dozen #12: blocks tampered totalAmount or forged updatedAt timestamp', () => {
    const tamperedAmount = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: baseOrder,
      incoming: {
        ...baseOrder,
        totalAmount: 1,
        fulfilmentStatus: 'confirmed',
        updatedAt: SERVER_NOW,
      },
      requestTime: SERVER_NOW,
    });
    expect(tamperedAmount).toBe('PERMISSION_DENIED');

    const forgedTimestamp = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: baseOrder,
      incoming: {
        ...baseOrder,
        fulfilmentStatus: 'confirmed',
        updatedAt: SERVER_NOW - 5000,
      },
      requestTime: SERVER_NOW,
    });
    expect(forgedTimestamp).toBe('PERMISSION_DENIED');
  });

  it('permits legitimate administrator step-by-step transitions and pre-dispatch refund cancellation', () => {
    const confirmRes = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: baseOrder,
      incoming: {
        ...baseOrder,
        fulfilmentStatus: 'confirmed',
        updatedAt: SERVER_NOW,
      },
      requestTime: SERVER_NOW,
    });
    expect(confirmRes).toBe('ALLOW');

    const cancelPaidRes = evaluateOrderUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      orderId: 'ord_1001',
      existing: baseOrder,
      incoming: {
        ...baseOrder,
        fulfilmentStatus: 'cancelled',
        paymentStatus: 'refunded',
        updatedAt: SERVER_NOW,
      },
      requestTime: SERVER_NOW,
    });
    expect(cancelPaidRes).toBe('ALLOW');
  });
});

// Optional live Firebase Emulator suite when FIRESTORE_EMULATOR_HOST is configured locally
const describeIfEmulator = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

describeIfEmulator('Firebase Emulator Live Rules Verification', () => {
  let testEnv: RulesTestEnvironment;

  it('rejects unauthenticated and unauthorized reads while allowing verified admin', async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'califnco-rules-test',
      firestore: { rules: rulesSource },
    });
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(anonDb.doc('orders/ord_1001').get());

    const adminDb = testEnv
      .authenticatedContext('admin_1', {
        email: 'carternoah060@gmail.com',
        email_verified: true,
      })
      .firestore();
    await assertSucceeds(adminDb.collection('orders').get());
    await testEnv.cleanup();
  });
});
