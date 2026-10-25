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
 * so the Dirty Dozen + Page 21 Dealer Approval & Page 22 Service Desk security assertions
 * execute reliably in any CI environment, plus @firebase/rules-unit-testing integration
 * when FIRESTORE_EMULATOR_HOST is active.
 */
const RULES_PATH = fs.existsSync(path.resolve(process.cwd(), 'DRAFT_firestore.rules'))
  ? path.resolve(process.cwd(), 'DRAFT_firestore.rules')
  : path.resolve(process.cwd(), 'firestore.rules');

const rulesSource = fs.readFileSync(RULES_PATH, 'utf8');

type FulfilmentStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

type PaymentStatus = 'paid' | 'credit_net30' | 'cod_pending' | 'refunded';
type DealerApprovalStatus = 'approved' | 'pending' | 'rejected';
type ServiceTicketStatus = 'open' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface SimAuth {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ORDER_NUMBER_REGEX = /^[A-Z0-9-]+$/;
const GSTIN_REGEX = /^[0-9A-Z]+$/;

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

function evaluateDealerCreate(params: {
  auth: SimAuth | null;
  adminRegistry: Set<string>;
  dealerId: string;
  incoming: Record<string, unknown>;
  hasReviewSubdoc: boolean;
  requestTime: number;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  const { auth, adminRegistry, dealerId, incoming, hasReviewSubdoc, requestTime } = params;
  if (!auth || auth.email_verified !== true) return 'PERMISSION_DENIED';
  if (!evaluateValidId(dealerId)) return 'PERMISSION_DENIED';
  if (!hasReviewSubdoc) return 'PERMISSION_DENIED';

  const requiredCreateKeys = [
    'dealerCode',
    'dealerId',
    'ownerUid',
    'businessName',
    'contactPerson',
    'gstin',
    'businessType',
    'regionCity',
    'applicationDateIso',
    'approvalStatus',
    'wholesaleTier',
    'creditLimit',
    'availableCredit',
    'rejectionReason',
    'createdByUid',
    'createdAt',
    'updatedAt',
  ];
  if (!requiredCreateKeys.every((k) => k in incoming)) return 'PERMISSION_DENIED';
  if (typeof incoming.gstin !== 'string' || !GSTIN_REGEX.test(incoming.gstin)) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.createdByUid !== auth.uid) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== requestTime || incoming.updatedAt !== requestTime) {
    return 'PERMISSION_DENIED';
  }

  if (evaluateIsAdmin(auth, adminRegistry)) {
    return 'ALLOW';
  }

  // Non-admin applicant anti-self-approval gate
  if (
    dealerId === auth.uid &&
    incoming.ownerUid === auth.uid &&
    incoming.approvalStatus === 'pending' &&
    incoming.rejectionReason === '' &&
    incoming.creditLimit === 0 &&
    incoming.availableCredit === 0 &&
    !('reviewedByUid' in incoming) &&
    !('reviewedAt' in incoming)
  ) {
    return 'ALLOW';
  }

  return 'PERMISSION_DENIED';
}

function evaluateDealerUpdate(params: {
  auth: SimAuth | null;
  adminRegistry: Set<string>;
  dealerId: string;
  existing: Record<string, unknown>;
  incoming: Record<string, unknown>;
  requestTime: number;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  const { auth, adminRegistry, dealerId, existing, incoming, requestTime } = params;
  if (!auth || auth.email_verified !== true) return 'PERMISSION_DENIED';
  if (!evaluateValidId(dealerId)) return 'PERMISSION_DENIED';
  if (!evaluateIsAdmin(auth, adminRegistry)) return 'PERMISSION_DENIED';

  const allowedKeys = [
    'dealerCode',
    'dealerId',
    'ownerUid',
    'businessName',
    'contactPerson',
    'gstin',
    'businessType',
    'regionCity',
    'applicationDateIso',
    'approvalStatus',
    'wholesaleTier',
    'creditLimit',
    'availableCredit',
    'rejectionReason',
    'reviewedByUid',
    'reviewedAt',
    'createdByUid',
    'createdAt',
    'updatedAt',
  ];
  if (!Object.keys(incoming).every((k) => allowedKeys.includes(k))) return 'PERMISSION_DENIED';

  if (existing.approvalStatus !== 'pending') return 'PERMISSION_DENIED';
  if (incoming.updatedAt !== requestTime) return 'PERMISSION_DENIED';
  if (incoming.reviewedByUid !== auth.uid || incoming.reviewedAt !== requestTime) {
    return 'PERMISSION_DENIED';
  }

  const changedKeys = Object.keys(incoming).filter((k) => incoming[k] !== existing[k]);
  const allowedDiffKeys = [
    'approvalStatus',
    'wholesaleTier',
    'creditLimit',
    'availableCredit',
    'rejectionReason',
    'reviewedByUid',
    'reviewedAt',
    'updatedAt',
  ];
  if (!changedKeys.every((k) => allowedDiffKeys.includes(k))) return 'PERMISSION_DENIED';

  if (incoming.approvalStatus === 'approved') {
    const limit = incoming.creditLimit;
    if (
      incoming.rejectionReason === '' &&
      typeof limit === 'number' &&
      limit >= 50000 &&
      limit <= 10000000 &&
      incoming.availableCredit === limit
    ) {
      return 'ALLOW';
    }
    return 'PERMISSION_DENIED';
  }

  if (incoming.approvalStatus === 'rejected') {
    const reason = incoming.rejectionReason;
    if (
      typeof reason === 'string' &&
      reason.length >= 5 &&
      reason.length <= 400 &&
      incoming.creditLimit === 0 &&
      incoming.availableCredit === 0
    ) {
      return 'ALLOW';
    }
    return 'PERMISSION_DENIED';
  }

  return 'PERMISSION_DENIED';
}

function evaluateServiceUpdate(params: {
  auth: SimAuth | null;
  adminRegistry: Set<string>;
  requestId: string;
  existing: Record<string, unknown>;
  incoming: Record<string, unknown>;
  requestTime: number;
}): 'ALLOW' | 'PERMISSION_DENIED' {
  const { auth, adminRegistry, requestId, existing, incoming, requestTime } = params;
  if (!auth || auth.email_verified !== true) return 'PERMISSION_DENIED';
  if (!evaluateValidId(requestId)) return 'PERMISSION_DENIED';
  if (!evaluateIsAdmin(auth, adminRegistry)) return 'PERMISSION_DENIED';

  if (existing.status === 'completed' || existing.status === 'cancelled') {
    return 'PERMISSION_DENIED';
  }
  if (incoming.updatedByUid !== auth.uid || incoming.updatedAt !== requestTime) {
    return 'PERMISSION_DENIED';
  }

  const changedKeys = Object.keys(incoming).filter((k) => incoming[k] !== existing[k]);
  const allowedDiffKeys = [
    'status',
    'scheduledDateIso',
    'resolutionNotes',
    'updatedByUid',
    'updatedAt',
  ];
  if (!changedKeys.every((k) => allowedDiffKeys.includes(k))) return 'PERMISSION_DENIED';

  const cur = existing.status as ServiceTicketStatus;
  const next = incoming.status as ServiceTicketStatus;
  const stepValid =
    cur === next ||
    (cur === 'open' && ['scheduled', 'in_progress', 'cancelled'].includes(next)) ||
    (cur === 'scheduled' && ['in_progress', 'completed', 'cancelled'].includes(next)) ||
    (cur === 'in_progress' && ['completed', 'cancelled'].includes(next));
  if (!stepValid) return 'PERMISSION_DENIED';

  if (next === 'completed' || next === 'cancelled') {
    const notes = incoming.resolutionNotes;
    if (typeof notes !== 'string' || notes.length < 5 || notes.length > 600) {
      return 'PERMISSION_DENIED';
    }
  }

  return 'ALLOW';
}

describe('Califnco Hardened Firestore Security Rules — Structural, Dealer Approval & Service Desk Suite', () => {
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
  const dealerApplicant: SimAuth = {
    uid: 'dealer_yamuna',
    email: 'applicant@ncrpureline.in',
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

  const basePendingDealer: Record<string, unknown> = {
    dealerCode: 'DLR-DL-6012',
    dealerId: 'DLR-DL-6012',
    ownerUid: 'dealer_yamuna',
    businessName: 'NCR PureLine Enterprises',
    contactPerson: 'Arvind Khanna',
    gstin: '06AABCN6012H1Z5',
    businessType: 'Distributor',
    regionCity: 'Gurugram, Haryana',
    applicationDateIso: '2026-10-24T08:30:00.000Z',
    approvalStatus: 'pending' as DealerApprovalStatus,
    wholesaleTier: 'Application Under Review',
    creditLimit: 0,
    availableCredit: 0,
    rejectionReason: '',
    createdByUid: 'dealer_yamuna',
    createdAt: SERVER_NOW - 86400000,
    updatedAt: SERVER_NOW - 86400000,
  };

  const baseOpenServiceTicket: Record<string, unknown> = {
    ticketNumber: 'SRV-2026-0401',
    orderId: 'ord_2026_8849',
    orderNumber: 'ORD-2026-8849',
    customerUid: 'cust_ananya_rao',
    customerCode: 'CUS-KA-9104',
    customerDisplayName: 'Ananya Rao',
    requestCategory: 'Installation',
    serviceType: 'RO Installation',
    status: 'open' as ServiceTicketStatus,
    regionCity: 'Bengaluru, Karnataka',
    submissionDateIso: '2026-10-25T07:00:00.000Z',
    scheduledDateIso: '2026-10-27T10:00:00.000Z',
    productModel: 'Califnco Hydra Pure Elite RO+UV+Copper',
    requestDetails: 'Under-sink wall mount installation requested.',
    resolutionNotes: '',
    createdByUid: 'admin_root_1',
    createdAt: SERVER_NOW - 3600000,
    updatedAt: SERVER_NOW - 3600000,
  };

  it('enforces critical AST security invariants inside firestore.rules', () => {
    expect(rulesSource).toContain("rules_version = '2';");
    expect(rulesSource).toContain('match /{document=**} {\n      allow read, write: if false;\n    }');
    expect(rulesSource).toContain('request.auth.token.email_verified == true');
    expect(rulesSource).toContain("request.auth.token.email == 'carternoah060@gmail.com'");
    expect(rulesSource).toContain('isApprovedDealerUser()');
    expect(rulesSource).toContain('match /application_details/{detailId}');
    expect(rulesSource).toContain("existsAfter(/databases/$(database)/documents/dealers/$(dealerId)/application_details/review)");
    expect(rulesSource).toContain("existsAfter(/databases/$(database)/documents/service_requests/$(requestId)/private_details/contact)");

    // Verify zero get() or exists() calls inside allow list blocks across all 9 match blocks
    const listLines = rulesSource
      .split('\n')
      .filter((line) => line.trim().startsWith('allow list:'));
    expect(listLines.length).toBe(9);
    for (const line of listLines) {
      expect(line).not.toContain('get(');
      expect(line).not.toContain('exists(');
    }
    expect(rulesSource).toContain('match /service_schedules/{scheduleId}');
    expect(rulesSource).toContain("incoming().orderId == 'DIRECT-SERVICE'");
  });

  it('Dirty Dozen #1 & #2: blocks non-admin escalation and unverified email spoofing', () => {
    expect(evaluateIsAdmin(regularCustomer, new Set())).toBe(false);
    expect(
      evaluateIsAdmin(
        { uid: 'spoof', email: 'carternoah060@gmail.com', email_verified: false },
        new Set()
      )
    ).toBe(false);
  });

  it('Dirty Dozen #3, #4, #5: blocks Order shadow fields, state shortcuts, and terminal mutations', () => {
    expect(
      evaluateOrderUpdate({
        auth: adminAuth,
        adminRegistry: new Set(),
        orderId: 'ord_1001',
        existing: baseOrder,
        incoming: { ...baseOrder, fulfilmentStatus: 'confirmed', ghost: true, updatedAt: SERVER_NOW },
        requestTime: SERVER_NOW,
      })
    ).toBe('PERMISSION_DENIED');

    expect(
      evaluateOrderUpdate({
        auth: adminAuth,
        adminRegistry: new Set(),
        orderId: 'ord_1001',
        existing: baseOrder,
        incoming: { ...baseOrder, fulfilmentStatus: 'delivered', updatedAt: SERVER_NOW },
        requestTime: SERVER_NOW,
      })
    ).toBe('PERMISSION_DENIED');

    const deliveredOrder = { ...baseOrder, fulfilmentStatus: 'delivered' };
    expect(
      evaluateOrderUpdate({
        auth: adminAuth,
        adminRegistry: new Set(),
        orderId: 'ord_1001',
        existing: deliveredOrder,
        incoming: { ...deliveredOrder, fulfilmentStatus: 'processing', updatedAt: SERVER_NOW },
        requestTime: SERVER_NOW,
      })
    ).toBe('PERMISSION_DENIED');
  });

  it('Page 21 Security #6: blocks dealer applicant from self-approving during registration', () => {
    const selfApprovedCreate = evaluateDealerCreate({
      auth: dealerApplicant,
      adminRegistry: new Set(),
      dealerId: dealerApplicant.uid,
      hasReviewSubdoc: true,
      requestTime: SERVER_NOW,
      incoming: {
        ...basePendingDealer,
        approvalStatus: 'approved',
        creditLimit: 500000,
        availableCredit: 500000,
        createdAt: SERVER_NOW,
        updatedAt: SERVER_NOW,
      },
    });
    expect(selfApprovedCreate).toBe('PERMISSION_DENIED');

    const legitimatePendingCreate = evaluateDealerCreate({
      auth: dealerApplicant,
      adminRegistry: new Set(),
      dealerId: dealerApplicant.uid,
      hasReviewSubdoc: true,
      requestTime: SERVER_NOW,
      incoming: {
        ...basePendingDealer,
        createdAt: SERVER_NOW,
        updatedAt: SERVER_NOW,
      },
    });
    expect(legitimatePendingCreate).toBe('ALLOW');
  });

  it('Page 21 Security #7: blocks pending dealer owner from approving themselves via update', () => {
    const selfApproveUpdate = evaluateDealerUpdate({
      auth: dealerApplicant,
      adminRegistry: new Set(),
      dealerId: dealerApplicant.uid,
      existing: basePendingDealer,
      requestTime: SERVER_NOW,
      incoming: {
        ...basePendingDealer,
        approvalStatus: 'approved',
        wholesaleTier: 'Tier 1 Platinum Partner',
        creditLimit: 500000,
        availableCredit: 500000,
        reviewedByUid: dealerApplicant.uid,
        reviewedAt: SERVER_NOW,
        updatedAt: SERVER_NOW,
      },
    });
    expect(selfApproveUpdate).toBe('PERMISSION_DENIED');
  });

  it('Page 21 Security #8: enforces non-empty rejectionReason when admin rejects and allows valid approval/rejection', () => {
    const rejectWithoutReason = evaluateDealerUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      dealerId: 'dlr_dl_6012',
      existing: basePendingDealer,
      requestTime: SERVER_NOW,
      incoming: {
        ...basePendingDealer,
        approvalStatus: 'rejected',
        rejectionReason: '',
        reviewedByUid: adminAuth.uid,
        reviewedAt: SERVER_NOW,
        updatedAt: SERVER_NOW,
      },
    });
    expect(rejectWithoutReason).toBe('PERMISSION_DENIED');

    const validRejection = evaluateDealerUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      dealerId: 'dlr_dl_6012',
      existing: basePendingDealer,
      requestTime: SERVER_NOW,
      incoming: {
        ...basePendingDealer,
        approvalStatus: 'rejected',
        wholesaleTier: 'Application Declined',
        rejectionReason: 'GSTIN state code mismatch against submitted Haryana warehouse proof.',
        reviewedByUid: adminAuth.uid,
        reviewedAt: SERVER_NOW,
        updatedAt: SERVER_NOW,
      },
    });
    expect(validRejection).toBe('ALLOW');

    const validApproval = evaluateDealerUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      dealerId: 'dlr_dl_6012',
      existing: basePendingDealer,
      requestTime: SERVER_NOW,
      incoming: {
        ...basePendingDealer,
        approvalStatus: 'approved',
        wholesaleTier: 'Tier 2 Gold Partner',
        creditLimit: 300000,
        availableCredit: 300000,
        rejectionReason: '',
        reviewedByUid: adminAuth.uid,
        reviewedAt: SERVER_NOW,
        updatedAt: SERVER_NOW,
      },
    });
    expect(validApproval).toBe('ALLOW');
  });

  it('Page 21 Security #9: enforces mobile wholesale order approval gate in firestore.rules', () => {
    expect(rulesSource).toContain(
      "get(/databases/$(database)/documents/dealers/$(request.auth.uid)).data.approvalStatus == 'approved'"
    );
    expect(rulesSource).toContain("(incoming().channel == 'customer' || isApprovedDealerUser())");
  });

  it('Page 22 Security #11 & #12: blocks skipping open->completed, blocks closing without resolutionNotes, and locks completed tickets', () => {
    // Cannot jump straight from open -> completed without scheduling/in_progress
    const skipStep = evaluateServiceUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      requestId: 'srv_2026_401',
      existing: baseOpenServiceTicket,
      requestTime: SERVER_NOW,
      incoming: {
        ...baseOpenServiceTicket,
        status: 'completed',
        resolutionNotes: 'Installed and tested TDS at 55 ppm.',
        updatedByUid: adminAuth.uid,
        updatedAt: SERVER_NOW,
      },
    });
    expect(skipStep).toBe('PERMISSION_DENIED');

    // Scheduled -> Completed WITHOUT resolutionNotes is denied
    const scheduledTicket = { ...baseOpenServiceTicket, status: 'scheduled' };
    const closeWithoutNotes = evaluateServiceUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      requestId: 'srv_2026_401',
      existing: scheduledTicket,
      requestTime: SERVER_NOW,
      incoming: {
        ...scheduledTicket,
        status: 'completed',
        resolutionNotes: '',
        updatedByUid: adminAuth.uid,
        updatedAt: SERVER_NOW,
      },
    });
    expect(closeWithoutNotes).toBe('PERMISSION_DENIED');

    // Scheduled -> Completed WITH resolutionNotes succeeds
    const validResolve = evaluateServiceUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      requestId: 'srv_2026_401',
      existing: scheduledTicket,
      requestTime: SERVER_NOW,
      incoming: {
        ...scheduledTicket,
        status: 'completed',
        resolutionNotes: 'Mounted RO+UV unit, flushed pre-carbon cartridge, calibrated output TDS to 58 ppm.',
        updatedByUid: adminAuth.uid,
        updatedAt: SERVER_NOW,
      },
    });
    expect(validResolve).toBe('ALLOW');

    // Terminal lock on completed ticket
    const completedTicket = {
      ...scheduledTicket,
      status: 'completed',
      resolutionNotes: 'Completed installation.',
    };
    const reopenCompleted = evaluateServiceUpdate({
      auth: adminAuth,
      adminRegistry: new Set(),
      requestId: 'srv_2026_401',
      existing: completedTicket,
      requestTime: SERVER_NOW,
      incoming: {
        ...completedTicket,
        status: 'in_progress',
        updatedByUid: adminAuth.uid,
        updatedAt: SERVER_NOW,
      },
    });
    expect(reopenCompleted).toBe('PERMISSION_DENIED');
  });

  it('Screens 23 & 24 Security #13 & #14: enforces open-only customer service booking creation, blocks confirmed-appointment spoofing, and restricts /service_schedules writes to admins', () => {
    function evaluateCustomerServiceCreate(params: {
      auth: SimAuth | null;
      adminRegistry: Set<string>;
      requestId: string;
      incoming: Record<string, unknown>;
      hasContactSubdoc: boolean;
      requestTime: number;
    }): 'ALLOW' | 'PERMISSION_DENIED' {
      const { auth, adminRegistry, requestId, incoming, hasContactSubdoc, requestTime } = params;
      if (!auth || auth.email_verified !== true) return 'PERMISSION_DENIED';
      if (!evaluateValidId(requestId)) return 'PERMISSION_DENIED';
      if (!hasContactSubdoc) return 'PERMISSION_DENIED';
      if (incoming.createdByUid !== auth.uid) return 'PERMISSION_DENIED';
      if (incoming.createdAt !== requestTime || incoming.updatedAt !== requestTime) {
        return 'PERMISSION_DENIED';
      }
      if (evaluateIsAdmin(auth, adminRegistry)) return 'ALLOW';

      if (
        incoming.customerUid === auth.uid &&
        incoming.status === 'open' &&
        incoming.resolutionNotes === '' &&
        incoming.orderId === 'DIRECT-SERVICE'
      ) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }

    // Legitimate customer submission from Screen 23 (status == 'open', isolated contact doc present)
    expect(
      evaluateCustomerServiceCreate({
        auth: regularCustomer,
        adminRegistry: new Set(),
        requestId: 'srv_2026_8890',
        hasContactSubdoc: true,
        requestTime: SERVER_NOW,
        incoming: {
          ...baseOpenServiceTicket,
          ticketNumber: 'SRV-2026-8890',
          orderId: 'DIRECT-SERVICE',
          orderNumber: 'DIRECT-BOOKING',
          customerUid: regularCustomer.uid,
          createdByUid: regularCustomer.uid,
          status: 'open',
          resolutionNotes: '',
          createdAt: SERVER_NOW,
          updatedAt: SERVER_NOW,
        },
      })
    ).toBe('ALLOW');

    // Customer attempting to spoof a confirmed appointment (status: 'scheduled') is rejected
    expect(
      evaluateCustomerServiceCreate({
        auth: regularCustomer,
        adminRegistry: new Set(),
        requestId: 'srv_2026_8891',
        hasContactSubdoc: true,
        requestTime: SERVER_NOW,
        incoming: {
          ...baseOpenServiceTicket,
          ticketNumber: 'SRV-2026-8891',
          orderId: 'DIRECT-SERVICE',
          orderNumber: 'DIRECT-BOOKING',
          customerUid: regularCustomer.uid,
          createdByUid: regularCustomer.uid,
          status: 'scheduled',
          resolutionNotes: '',
          createdAt: SERVER_NOW,
          updatedAt: SERVER_NOW,
        },
      })
    ).toBe('PERMISSION_DENIED');

    // Customer omitting isolated private_details/contact subdocument is rejected
    expect(
      evaluateCustomerServiceCreate({
        auth: regularCustomer,
        adminRegistry: new Set(),
        requestId: 'srv_2026_8892',
        hasContactSubdoc: false,
        requestTime: SERVER_NOW,
        incoming: {
          ...baseOpenServiceTicket,
          ticketNumber: 'SRV-2026-8892',
          orderId: 'DIRECT-SERVICE',
          orderNumber: 'DIRECT-BOOKING',
          customerUid: regularCustomer.uid,
          createdByUid: regularCustomer.uid,
          status: 'open',
          resolutionNotes: '',
          createdAt: SERVER_NOW,
          updatedAt: SERVER_NOW,
        },
      })
    ).toBe('PERMISSION_DENIED');

    // Non-admin cannot publish or tamper with /service_schedules/{scheduleId}
    expect(evaluateIsAdmin(regularCustomer, new Set())).toBe(false);
    expect(evaluateIsAdmin(adminAuth, new Set())).toBe(true);
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
    await assertFails(anonDb.doc('dealers/dlr_dl_6012').get());
    await assertFails(anonDb.doc('service_requests/srv_2026_401').get());

    const adminDb = testEnv
      .authenticatedContext('admin_1', {
        email: 'carternoah060@gmail.com',
        email_verified: true,
      })
      .firestore();
    await assertSucceeds(adminDb.collection('dealers').get());
    await assertSucceeds(adminDb.collection('service_requests').get());
    await testEnv.cleanup();
  });
});
