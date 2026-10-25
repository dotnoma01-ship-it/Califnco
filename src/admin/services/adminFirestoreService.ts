import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  DEMO_DEALERS,
  DEMO_ORDER_ITEMS,
  DEMO_ORDERS,
  DEMO_SERVICE_REQUESTS,
  SEED_DEALER_REVIEW_DETAILS,
  SEED_PRIVATE_SHIPPING_BY_ORDER,
  SEED_SERVICE_PRIVATE_CONTACTS,
} from '../demoData';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  canSettleOrderPayment,
  inferServiceCategory,
  VALIDATION_CONSTRAINTS,
  validateServiceStatusTransition,
  validateStatusTransition,
  type DealerApplicationReviewDetails,
  type DealerBusinessType,
  type DealerSummary,
  type FulfilmentStatus,
  type OrderLineItem,
  type OrderPrivateDetails,
  type OrderSummary,
  type PaymentStatus,
  type ServiceRequest,
  type ServiceRequestCategory,
  type ServiceRequestPrivateContact,
  type ServiceRequestType,
  type ServiceTicketStatus,
} from '../types';

function assertValidDocId(id: string, label: string): void {
  if (
    !id ||
    id.length > VALIDATION_CONSTRAINTS.ID_MAX_LENGTH ||
    !VALIDATION_CONSTRAINTS.ID_PATTERN.test(id)
  ) {
    throw new Error(`Invalid ${label} identifier format.`);
  }
}

function timestampToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return undefined;
}

const VALID_BUSINESS_TYPES: DealerBusinessType[] = [
  'Distributor',
  'Retail Franchise',
  'Commercial Integrator',
  'Service Franchise',
];

const VALID_SERVICE_TYPES: ServiceRequestType[] = [
  'RO Installation',
  'Preventive Maintenance',
  '6-Month Filter Check',
  'Purifier Repair',
  'Booster Pump Calibration',
  'Warranty Repair',
];

const VALID_SERVICE_STATUSES: ServiceTicketStatus[] = [
  'open',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
];

/**
 * Verifies administrator authorization against Firebase Auth email verification
 * and Cloud Firestore's /admins/{uid} RBAC collection.
 */
export async function verifyAdminAccess(user: User): Promise<boolean> {
  if (!user.emailVerified) {
    return false;
  }
  if (user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  assertValidDocId(user.uid, 'admin');
  const adminPath = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (msg.includes('permission') || msg.includes('insufficient')) {
      return false;
    }
    handleFirestoreError(error, OperationType.GET, adminPath);
  }
}

export interface LiveAdminSubscriptionHandlers {
  onOrders: (orders: OrderSummary[]) => void;
  onDealers: (dealers: DealerSummary[]) => void;
  onServiceRequests: (tickets: ServiceRequest[]) => void;
  onError: (message: string) => void;
}

export function subscribeAdminWorkspace(handlers: LiveAdminSubscriptionHandlers): Unsubscribe {
  const ordersPath = 'orders';
  const dealersPath = 'dealers';
  const servicePath = 'service_requests';

  const ordersQuery = query(collection(db, ordersPath), orderBy('orderDateIso', 'desc'));

  const unsubOrders = onSnapshot(
    ordersQuery,
    (snapshot) => {
      const records: OrderSummary[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          orderNumber: String(d.orderNumber ?? ''),
          channel: d.channel === 'dealer' ? 'dealer' : 'customer',
          customerUid: String(d.customerUid ?? ''),
          partyId: String(d.partyId ?? ''),
          partyDisplayName: String(d.partyDisplayName ?? ''),
          regionCity: String(d.regionCity ?? ''),
          orderDateIso: String(d.orderDateIso ?? ''),
          itemCount: Number(d.itemCount ?? 0),
          subtotalAmount: Number(d.subtotalAmount ?? 0),
          deliveryAmount: Number(d.deliveryAmount ?? 0),
          totalAmount: Number(d.totalAmount ?? 0),
          paymentStatus: (d.paymentStatus as PaymentStatus) ?? 'cod_pending',
          fulfilmentStatus: (d.fulfilmentStatus as FulfilmentStatus) ?? 'pending',
          createdByUid: String(d.createdByUid ?? ''),
          updatedAtIso: timestampToIso(d.updatedAt),
        };
      });
      handlers.onOrders(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, ordersPath);
      } catch (formatted) {
        handlers.onError(formatted instanceof Error ? formatted.message : String(formatted));
      }
    }
  );

  const unsubDealers = onSnapshot(
    collection(db, dealersPath),
    (snapshot) => {
      const records: DealerSummary[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const dealerCode = String(d.dealerCode ?? d.dealerId ?? '');
        const rawBusinessType = String(d.businessType ?? '');
        const businessType: DealerBusinessType = VALID_BUSINESS_TYPES.includes(
          rawBusinessType as DealerBusinessType
        )
          ? (rawBusinessType as DealerBusinessType)
          : 'Distributor';

        const createdIso = timestampToIso(d.createdAt) ?? '';

        return {
          id: docSnap.id,
          dealerCode,
          dealerId: String(d.dealerId ?? dealerCode),
          ownerUid: String(d.ownerUid ?? ''),
          businessName: String(d.businessName ?? ''),
          contactPerson: String(d.contactPerson ?? 'Authorized Representative'),
          gstin: String(d.gstin ?? 'PENDING-VERIFICATION'),
          businessType,
          regionCity: String(d.regionCity ?? ''),
          applicationDateIso: String(d.applicationDateIso ?? createdIso),
          approvalStatus:
            d.approvalStatus === 'approved' || d.approvalStatus === 'rejected'
              ? d.approvalStatus
              : 'pending',
          wholesaleTier: String(d.wholesaleTier ?? ''),
          creditLimit: Number(d.creditLimit ?? 0),
          availableCredit: Number(d.availableCredit ?? 0),
          rejectionReason: String(d.rejectionReason ?? ''),
          reviewedByUid: d.reviewedByUid ? String(d.reviewedByUid) : undefined,
          reviewedAtIso: timestampToIso(d.reviewedAt),
          createdByUid: String(d.createdByUid ?? ''),
          updatedAtIso: timestampToIso(d.updatedAt),
        };
      });
      records.sort((a, b) => (b.applicationDateIso || '').localeCompare(a.applicationDateIso || ''));
      handlers.onDealers(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, dealersPath);
      } catch (formatted) {
        handlers.onError(formatted instanceof Error ? formatted.message : String(formatted));
      }
    }
  );

  const unsubServices = onSnapshot(
    collection(db, servicePath),
    (snapshot) => {
      const records: ServiceRequest[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const rawType = String(d.serviceType ?? 'RO Installation');
        const serviceType: ServiceRequestType = VALID_SERVICE_TYPES.includes(
          rawType as ServiceRequestType
        )
          ? (rawType as ServiceRequestType)
          : 'RO Installation';

        const rawCategory = String(d.requestCategory ?? '');
        const requestCategory: ServiceRequestCategory =
          rawCategory === 'Installation' ||
          rawCategory === 'Maintenance' ||
          rawCategory === 'Repair'
            ? rawCategory
            : inferServiceCategory(serviceType);

        const rawStatus = String(d.status ?? 'open');
        const status: ServiceTicketStatus = VALID_SERVICE_STATUSES.includes(
          rawStatus as ServiceTicketStatus
        )
          ? (rawStatus as ServiceTicketStatus)
          : 'open';

        const createdIso = timestampToIso(d.createdAt) ?? String(d.scheduledDateIso ?? '');
        const customerUid = String(d.customerUid ?? '');

        return {
          id: docSnap.id,
          ticketNumber: String(d.ticketNumber ?? ''),
          orderId: String(d.orderId ?? ''),
          orderNumber: String(d.orderNumber ?? ''),
          customerUid,
          customerCode: String(d.customerCode ?? customerUid.toUpperCase().replace(/_/g, '-')),
          customerDisplayName: String(d.customerDisplayName ?? customerUid),
          requestCategory,
          serviceType,
          status,
          regionCity: String(d.regionCity ?? ''),
          submissionDateIso: String(d.submissionDateIso ?? createdIso),
          scheduledDateIso: String(d.scheduledDateIso ?? ''),
          preferredTimeSlot: d.preferredTimeSlot ? String(d.preferredTimeSlot) : undefined,
          productId: d.productId ? String(d.productId) : undefined,
          productModel: String(d.productModel ?? 'Califnco Water Purification System'),
          requestDetails: String(
            d.requestDetails ??
              `${serviceType} requested for order ${String(d.orderNumber ?? '')} in ${String(d.regionCity ?? '')}.`
          ),
          resolutionNotes: String(d.resolutionNotes ?? ''),
          updatedByUid: d.updatedByUid ? String(d.updatedByUid) : undefined,
          createdByUid: String(d.createdByUid ?? ''),
          updatedAtIso: timestampToIso(d.updatedAt),
        };
      });
      records.sort((a, b) => (b.submissionDateIso || '').localeCompare(a.submissionDateIso || ''));
      handlers.onServiceRequests(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, servicePath);
      } catch (formatted) {
        handlers.onError(formatted instanceof Error ? formatted.message : String(formatted));
      }
    }
  );

  return () => {
    unsubOrders();
    unsubDealers();
    unsubServices();
  };
}

export async function fetchOrderInspectionDetails(orderId: string): Promise<{
  items: OrderLineItem[];
  privateDetails: OrderPrivateDetails | null;
}> {
  assertValidDocId(orderId, 'order');

  const itemsPath = `orders/${orderId}/items`;
  const shippingPath = `orders/${orderId}/private_details/shipping`;

  let items: OrderLineItem[] = [];
  let privateDetails: OrderPrivateDetails | null = null;

  try {
    const itemsSnap = await getDocs(collection(db, 'orders', orderId, 'items'));
    items = itemsSnap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        orderId: String(d.orderId ?? orderId),
        customerUid: String(d.customerUid ?? ''),
        sku: String(d.sku ?? ''),
        productName: String(d.productName ?? ''),
        category: (d.category as OrderLineItem['category']) ?? 'Water Purifiers',
        quantity: Number(d.quantity ?? 1),
        unitPrice: Number(d.unitPrice ?? 0),
        lineTotal: Number(d.lineTotal ?? 0),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, itemsPath);
  }

  try {
    const shippingSnap = await getDoc(doc(db, 'orders', orderId, 'private_details', 'shipping'));
    if (shippingSnap.exists()) {
      const d = shippingSnap.data();
      privateDetails = {
        orderId: String(d.orderId ?? orderId),
        recipientName: String(d.recipientName ?? ''),
        email: String(d.email ?? ''),
        phone: String(d.phone ?? ''),
        shippingAddress: String(d.shippingAddress ?? ''),
        postalCode: String(d.postalCode ?? ''),
        gstin: String(d.gstin ?? ''),
        dispatchNotes: String(d.dispatchNotes ?? ''),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, shippingPath);
  }

  return { items, privateDetails };
}

function buildTrustedOrderTransitionNotification(
  order: OrderSummary,
  nextFulfilment?: FulfilmentStatus,
  paymentSettled?: boolean
): {
  eventType:
    | 'order_confirmed'
    | 'order_processing'
    | 'order_dispatched'
    | 'order_delivered'
    | 'order_cancelled'
    | 'payment_settled';
  title: string;
  body: string;
} | null {
  if (paymentSettled) {
    return {
      eventType: 'payment_settled',
      title: `Payment Settled for ${order.orderNumber}`,
      body: `Payment for Califnco order ${order.orderNumber} has been verified and recorded by administration.`,
    };
  }
  switch (nextFulfilment) {
    case 'confirmed':
      return {
        eventType: 'order_confirmed',
        title: `Order ${order.orderNumber} Confirmed`,
        body: `Your Califnco order ${order.orderNumber} has been verified and queued for warehouse inspection.`,
      };
    case 'processing':
      return {
        eventType: 'order_processing',
        title: `Preparing Order ${order.orderNumber}`,
        body: `Specialists are testing and packaging your water purification equipment for ${order.orderNumber}.`,
      };
    case 'dispatched':
      return {
        eventType: 'order_dispatched',
        title: `Order ${order.orderNumber} Dispatched`,
        body: `Shipment ${order.orderNumber} has departed Califnco Logistics for ${order.regionCity}.`,
      };
    case 'delivered':
      return {
        eventType: 'order_delivered',
        title: `Order ${order.orderNumber} Delivered`,
        body: `Order ${order.orderNumber} was delivered in ${order.regionCity}. Book certified installation anytime in Service Booking.`,
      };
    case 'cancelled':
      return {
        eventType: 'order_cancelled',
        title: `Order ${order.orderNumber} Cancelled`,
        body: `Order ${order.orderNumber} has been cancelled. Eligible prepaid balances are queued for refund.`,
      };
    default:
      return null;
  }
}

export async function transitionOrderFulfilment(
  order: OrderSummary,
  nextStatus: FulfilmentStatus,
  adminUid?: string
): Promise<void> {
  assertValidDocId(order.id, 'order');
  const check = validateStatusTransition(order.fulfilmentStatus, nextStatus);
  if (!check.valid) {
    throw new Error(check.reason || 'Invalid status transition.');
  }

  const orderPath = `orders/${order.id}`;
  const payload: Record<string, unknown> = {
    fulfilmentStatus: nextStatus,
    updatedAt: serverTimestamp(),
  };

  if (nextStatus === 'cancelled' && order.paymentStatus === 'paid') {
    payload.paymentStatus = 'refunded';
  }

  const copy = buildTrustedOrderTransitionNotification(order, nextStatus, false);
  const validRecipient =
    order.customerUid &&
    order.customerUid.length <= VALIDATION_CONSTRAINTS.ID_MAX_LENGTH &&
    VALIDATION_CONSTRAINTS.ID_PATTERN.test(order.customerUid);

  const effectiveAdminUid = adminUid ?? auth.currentUser?.uid;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', order.id), payload);

    if (
      copy &&
      validRecipient &&
      effectiveAdminUid &&
      VALIDATION_CONSTRAINTS.ID_PATTERN.test(effectiveAdminUid)
    ) {
      const notifId = `notif_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      batch.set(doc(db, 'notifications', notifId), {
        recipientUid: order.customerUid,
        title: copy.title.slice(0, 140),
        body: copy.body.slice(0, 500),
        eventType: copy.eventType,
        orderId: order.id,
        orderNumber: order.orderNumber.slice(0, 40),
        source: 'trusted_admin_console_event',
        isRead: false,
        createdAtIso: new Date().toISOString(),
        createdByUid: effectiveAdminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, orderPath);
  }
}

export async function settleOrderPayment(
  order: OrderSummary,
  adminUid?: string
): Promise<void> {
  assertValidDocId(order.id, 'order');
  if (!canSettleOrderPayment(order)) {
    throw new Error('Only active orders with COD or Net-30 credit can be marked as paid.');
  }

  const orderPath = `orders/${order.id}`;
  const copy = buildTrustedOrderTransitionNotification(order, undefined, true);
  const validRecipient =
    order.customerUid &&
    order.customerUid.length <= VALIDATION_CONSTRAINTS.ID_MAX_LENGTH &&
    VALIDATION_CONSTRAINTS.ID_PATTERN.test(order.customerUid);
  const effectiveAdminUid = adminUid ?? auth.currentUser?.uid;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', order.id), {
      paymentStatus: 'paid',
      updatedAt: serverTimestamp(),
    });

    if (
      copy &&
      validRecipient &&
      effectiveAdminUid &&
      VALIDATION_CONSTRAINTS.ID_PATTERN.test(effectiveAdminUid)
    ) {
      const notifId = `notif_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      batch.set(doc(db, 'notifications', notifId), {
        recipientUid: order.customerUid,
        title: copy.title.slice(0, 140),
        body: copy.body.slice(0, 500),
        eventType: copy.eventType,
        orderId: order.id,
        orderNumber: order.orderNumber.slice(0, 40),
        source: 'trusted_admin_console_event',
        isRead: false,
        createdAtIso: new Date().toISOString(),
        createdByUid: effectiveAdminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, orderPath);
  }
}

export async function updateOrderDispatchNotes(
  orderId: string,
  dispatchNotes: string
): Promise<void> {
  assertValidDocId(orderId, 'order');
  const sanitized = dispatchNotes.trim().slice(0, VALIDATION_CONSTRAINTS.DISPATCH_NOTES_MAX_LENGTH);
  const shippingPath = `orders/${orderId}/private_details/shipping`;

  try {
    await updateDoc(doc(db, 'orders', orderId, 'private_details', 'shipping'), {
      dispatchNotes: sanitized,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, shippingPath);
  }
}

// ============================================================================
// PAGE 21: DEALER APPROVAL — FIRESTORE SERVICES
// ============================================================================

export async function fetchDealerApplicationDetails(
  dealerDocId: string
): Promise<DealerApplicationReviewDetails | null> {
  assertValidDocId(dealerDocId, 'dealer');
  const reviewPath = `dealers/${dealerDocId}/application_details/review`;

  try {
    const snap = await getDoc(doc(db, 'dealers', dealerDocId, 'application_details', 'review'));
    if (!snap.exists()) {
      return null;
    }
    const d = snap.data();
    return {
      dealerDocId: String(d.dealerDocId ?? dealerDocId),
      applicantEmail: String(d.applicantEmail ?? ''),
      applicantPhone: String(d.applicantPhone ?? ''),
      registeredWarehouse: String(d.registeredWarehouse ?? ''),
      annualProjectedVolumeInr: Number(d.annualProjectedVolumeInr ?? 0),
      applicantNotes: String(d.applicantNotes ?? ''),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, reviewPath);
  }
}

export async function approveDealerApplication(params: {
  dealer: DealerSummary;
  adminUid: string;
  wholesaleTier: string;
  creditLimit: number;
}): Promise<void> {
  const { dealer, adminUid, wholesaleTier, creditLimit } = params;
  assertValidDocId(dealer.id, 'dealer');
  assertValidDocId(adminUid, 'adminUid');

  if (dealer.approvalStatus !== 'pending') {
    throw new Error('Only pending dealer applications can be approved.');
  }
  if (dealer.ownerUid === adminUid) {
    throw new Error('Self-approval is prohibited by security policy.');
  }

  const sanitizedTier = wholesaleTier.trim().slice(0, 80);
  if (sanitizedTier.length < 2) {
    throw new Error('Select a valid wholesale partner tier.');
  }

  const boundedCredit = Math.trunc(creditLimit);
  if (
    boundedCredit < VALIDATION_CONSTRAINTS.DEALER_CREDIT_MIN_APPROVED ||
    boundedCredit > VALIDATION_CONSTRAINTS.DEALER_CREDIT_MAX_APPROVED
  ) {
    throw new Error('Credit limit must be between ₹50,000 and ₹1,00,00,000.');
  }

  const dealerPath = `dealers/${dealer.id}`;
  try {
    await updateDoc(doc(db, 'dealers', dealer.id), {
      approvalStatus: 'approved',
      wholesaleTier: sanitizedTier,
      creditLimit: boundedCredit,
      availableCredit: boundedCredit,
      rejectionReason: '',
      reviewedByUid: adminUid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, dealerPath);
  }
}

export async function rejectDealerApplication(params: {
  dealer: DealerSummary;
  adminUid: string;
  rejectionReason: string;
}): Promise<void> {
  const { dealer, adminUid, rejectionReason } = params;
  assertValidDocId(dealer.id, 'dealer');
  assertValidDocId(adminUid, 'adminUid');

  if (dealer.approvalStatus !== 'pending') {
    throw new Error('Only pending dealer applications can be rejected.');
  }

  const sanitizedReason = rejectionReason
    .trim()
    .slice(0, VALIDATION_CONSTRAINTS.REJECTION_REASON_MAX_LENGTH);

  if (sanitizedReason.length < VALIDATION_CONSTRAINTS.REJECTION_REASON_MIN_LENGTH) {
    throw new Error(
      `Provide a clear rejection reason of at least ${VALIDATION_CONSTRAINTS.REJECTION_REASON_MIN_LENGTH} characters.`
    );
  }

  const dealerPath = `dealers/${dealer.id}`;
  try {
    await updateDoc(doc(db, 'dealers', dealer.id), {
      approvalStatus: 'rejected',
      wholesaleTier: 'Application Declined',
      creditLimit: 0,
      availableCredit: 0,
      rejectionReason: sanitizedReason,
      reviewedByUid: adminUid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, dealerPath);
  }
}

// ============================================================================
// PAGE 22: SERVICE DESK — FIRESTORE SERVICES
// ============================================================================

export async function fetchServicePrivateContact(
  requestId: string
): Promise<ServiceRequestPrivateContact | null> {
  assertValidDocId(requestId, 'serviceRequest');
  const contactPath = `service_requests/${requestId}/private_details/contact`;

  try {
    const snap = await getDoc(
      doc(db, 'service_requests', requestId, 'private_details', 'contact')
    );
    if (!snap.exists()) {
      return null;
    }
    const d = snap.data();
    return {
      requestId: String(d.requestId ?? requestId),
      contactName: String(d.contactName ?? ''),
      phone: String(d.phone ?? ''),
      serviceAddress: String(d.serviceAddress ?? ''),
      waterSourceTdsPpm: Number(d.waterSourceTdsPpm ?? 0),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, contactPath);
  }
}

export async function updateServiceRequestTicket(params: {
  ticket: ServiceRequest;
  adminUid: string;
  nextStatus: ServiceTicketStatus;
  scheduledDateIso: string;
  resolutionNotes: string;
}): Promise<void> {
  const { ticket, adminUid, nextStatus, scheduledDateIso, resolutionNotes } = params;
  assertValidDocId(ticket.id, 'serviceRequest');
  assertValidDocId(adminUid, 'adminUid');

  const sanitizedNotes = resolutionNotes
    .trim()
    .slice(0, VALIDATION_CONSTRAINTS.RESOLUTION_NOTES_MAX_LENGTH);

  const check = validateServiceStatusTransition(ticket.status, nextStatus, sanitizedNotes);
  if (!check.valid) {
    throw new Error(check.reason || 'Invalid service request update.');
  }

  const sanitizedSchedule = scheduledDateIso.trim().slice(0, 40) || ticket.scheduledDateIso;
  if (sanitizedSchedule.length < 10) {
    throw new Error('Provide a valid scheduled service date.');
  }

  const ticketPath = `service_requests/${ticket.id}`;
  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.update(doc(db, 'service_requests', ticket.id), {
      status: nextStatus,
      scheduledDateIso: sanitizedSchedule,
      resolutionNotes: sanitizedNotes,
      updatedByUid: adminUid,
      updatedAt: now,
    });

    // Emit a trusted customer notification when an appointment slot is confirmed by Service Desk
    const validRecipient =
      Boolean(ticket.customerUid) &&
      ticket.customerUid.length <= VALIDATION_CONSTRAINTS.ID_MAX_LENGTH &&
      VALIDATION_CONSTRAINTS.ID_PATTERN.test(ticket.customerUid);

    if (ticket.status !== 'scheduled' && nextStatus === 'scheduled' && validRecipient) {
      const notifId = `notif_srv_${ticket.id}_${Date.now()}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 96);
      const formattedDate = sanitizedSchedule.slice(0, 10);
      const validOrderId =
        Boolean(ticket.orderId) &&
        ticket.orderId.length <= VALIDATION_CONSTRAINTS.ID_MAX_LENGTH &&
        VALIDATION_CONSTRAINTS.ID_PATTERN.test(ticket.orderId);

      batch.set(doc(db, 'notifications', notifId), {
        recipientUid: ticket.customerUid,
        title: `Technician Visit Scheduled (${ticket.ticketNumber})`.slice(0, 140),
        body: `Your Califnco ${ticket.serviceType} appointment for ${ticket.productModel} is confirmed for ${formattedDate}.`.slice(
          0,
          500
        ),
        eventType: 'service_scheduled',
        orderId: validOrderId ? ticket.orderId : 'DIRECT-SERVICE',
        orderNumber: /^[A-Z0-9-]{5,40}$/.test(ticket.orderNumber)
          ? ticket.orderNumber
          : 'DIRECT-SERVICE',
        source: 'trusted_admin_console_event',
        isRead: false,
        createdAtIso: new Date().toISOString(),
        createdByUid: adminUid,
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, ticketPath);
  }
}

// ============================================================================
// ATOMIC FIRESTORE SEEDING & INCREMENTAL SAMPLE SYNC
// ============================================================================

/**
 * Atomically seeds initial operational records into an empty live Cloud Firestore database
 * when explicitly triggered by an authenticated administrator.
 */
export async function seedInitialFirestoreData(adminUid: string): Promise<void> {
  assertValidDocId(adminUid, 'adminUid');
  const batch = writeBatch(db);
  const now = serverTimestamp();

  for (const order of DEMO_ORDERS) {
    assertValidDocId(order.id, 'order');
    const orderRef = doc(db, 'orders', order.id);
    batch.set(orderRef, {
      orderNumber: order.orderNumber.slice(0, VALIDATION_CONSTRAINTS.ORDER_NUMBER_MAX_LENGTH),
      channel: order.channel,
      customerUid: order.customerUid,
      partyId: order.partyId.slice(0, VALIDATION_CONSTRAINTS.PARTY_ID_MAX_LENGTH),
      partyDisplayName: order.partyDisplayName.slice(0, VALIDATION_CONSTRAINTS.PARTY_NAME_MAX_LENGTH),
      regionCity: order.regionCity.slice(0, VALIDATION_CONSTRAINTS.REGION_CITY_MAX_LENGTH),
      orderDateIso: order.orderDateIso,
      itemCount: Math.trunc(order.itemCount),
      subtotalAmount: order.subtotalAmount,
      deliveryAmount: order.deliveryAmount,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      createdByUid: adminUid,
      createdAt: now,
      updatedAt: now,
    });

    const shipping = SEED_PRIVATE_SHIPPING_BY_ORDER[order.id];
    if (shipping) {
      const shippingRef = doc(db, 'orders', order.id, 'private_details', 'shipping');
      batch.set(shippingRef, {
        orderId: order.id,
        recipientName: shipping.recipientName.slice(0, VALIDATION_CONSTRAINTS.PARTY_NAME_MAX_LENGTH),
        email: shipping.email.slice(0, 160),
        phone: shipping.phone.slice(0, 24),
        shippingAddress: shipping.shippingAddress.slice(
          0,
          VALIDATION_CONSTRAINTS.SHIPPING_ADDRESS_MAX_LENGTH
        ),
        postalCode: shipping.postalCode.slice(0, VALIDATION_CONSTRAINTS.POSTAL_CODE_MAX_LENGTH),
        gstin: shipping.gstin.slice(0, VALIDATION_CONSTRAINTS.GSTIN_MAX_LENGTH),
        dispatchNotes: shipping.dispatchNotes.slice(
          0,
          VALIDATION_CONSTRAINTS.DISPATCH_NOTES_MAX_LENGTH
        ),
        createdAt: now,
        updatedAt: now,
      });
    }

    const lineItems = DEMO_ORDER_ITEMS[order.id] ?? [];
    for (const item of lineItems) {
      assertValidDocId(item.id, 'item');
      const itemRef = doc(db, 'orders', order.id, 'items', item.id);
      batch.set(itemRef, {
        orderId: order.id,
        customerUid: item.customerUid,
        sku: item.sku.slice(0, 40),
        productName: item.productName.slice(0, 160),
        category: item.category,
        quantity: Math.trunc(item.quantity),
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        createdAt: now,
      });
    }
  }

  for (const dealer of DEMO_DEALERS) {
    assertValidDocId(dealer.id, 'dealer');
    const dealerRef = doc(db, 'dealers', dealer.id);
    batch.set(dealerRef, {
      dealerCode: dealer.dealerCode,
      dealerId: dealer.dealerId,
      ownerUid: dealer.ownerUid,
      businessName: dealer.businessName.slice(0, 140),
      contactPerson: dealer.contactPerson.slice(0, 100),
      gstin: dealer.gstin.slice(0, VALIDATION_CONSTRAINTS.GSTIN_MAX_LENGTH),
      businessType: dealer.businessType,
      regionCity: dealer.regionCity.slice(0, 80),
      applicationDateIso: dealer.applicationDateIso,
      approvalStatus: dealer.approvalStatus,
      wholesaleTier: dealer.wholesaleTier.slice(0, 80),
      creditLimit: dealer.creditLimit,
      availableCredit: dealer.availableCredit,
      rejectionReason: dealer.rejectionReason.slice(
        0,
        VALIDATION_CONSTRAINTS.REJECTION_REASON_MAX_LENGTH
      ),
      createdByUid: adminUid,
      createdAt: now,
      updatedAt: now,
    });

    const review = SEED_DEALER_REVIEW_DETAILS[dealer.id];
    if (review) {
      const reviewRef = doc(db, 'dealers', dealer.id, 'application_details', 'review');
      batch.set(reviewRef, {
        dealerDocId: dealer.id,
        applicantEmail: review.applicantEmail.slice(0, 160),
        applicantPhone: review.applicantPhone.slice(0, 24),
        registeredWarehouse: review.registeredWarehouse.slice(0, 320),
        annualProjectedVolumeInr: review.annualProjectedVolumeInr,
        applicantNotes: review.applicantNotes.slice(0, 500),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const srv of DEMO_SERVICE_REQUESTS) {
    assertValidDocId(srv.id, 'serviceRequest');
    const srvRef = doc(db, 'service_requests', srv.id);
    batch.set(srvRef, {
      ticketNumber: srv.ticketNumber,
      orderId: srv.orderId,
      orderNumber: srv.orderNumber,
      customerUid: srv.customerUid,
      customerCode: srv.customerCode.slice(0, 40),
      customerDisplayName: srv.customerDisplayName.slice(0, 120),
      requestCategory: srv.requestCategory,
      serviceType: srv.serviceType,
      status: srv.status,
      regionCity: srv.regionCity.slice(0, 80),
      submissionDateIso: srv.submissionDateIso,
      scheduledDateIso: srv.scheduledDateIso,
      productModel: srv.productModel.slice(0, 160),
      requestDetails: srv.requestDetails.slice(
        0,
        VALIDATION_CONSTRAINTS.REQUEST_DETAILS_MAX_LENGTH
      ),
      resolutionNotes: srv.resolutionNotes.slice(
        0,
        VALIDATION_CONSTRAINTS.RESOLUTION_NOTES_MAX_LENGTH
      ),
      createdByUid: adminUid,
      createdAt: now,
      updatedAt: now,
    });

    const contact = SEED_SERVICE_PRIVATE_CONTACTS[srv.id];
    if (contact) {
      const contactRef = doc(db, 'service_requests', srv.id, 'private_details', 'contact');
      batch.set(contactRef, {
        requestId: srv.id,
        contactName: contact.contactName.slice(0, 120),
        phone: contact.phone.slice(0, 24),
        serviceAddress: contact.serviceAddress.slice(0, 320),
        waterSourceTdsPpm: contact.waterSourceTdsPpm,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'orders');
  }
}

/**
 * Adds any missing sample Dealer Applications and Service Desk Tickets (plus isolated review/contact subdocs)
 * without overwriting already-existing documents in live Cloud Firestore.
 */
export async function syncMissingDealerAndServiceSamples(params: {
  adminUid: string;
  existingOrderIds: Set<string>;
  existingDealerIds: Set<string>;
  existingServiceIds: Set<string>;
}): Promise<number> {
  const { adminUid, existingOrderIds, existingDealerIds, existingServiceIds } = params;
  assertValidDocId(adminUid, 'adminUid');

  const batch = writeBatch(db);
  const now = serverTimestamp();
  let addedCount = 0;

  for (const dealer of DEMO_DEALERS) {
    if (existingDealerIds.has(dealer.id)) continue;
    assertValidDocId(dealer.id, 'dealer');
    batch.set(doc(db, 'dealers', dealer.id), {
      dealerCode: dealer.dealerCode,
      dealerId: dealer.dealerId,
      ownerUid: dealer.ownerUid,
      businessName: dealer.businessName.slice(0, 140),
      contactPerson: dealer.contactPerson.slice(0, 100),
      gstin: dealer.gstin.slice(0, VALIDATION_CONSTRAINTS.GSTIN_MAX_LENGTH),
      businessType: dealer.businessType,
      regionCity: dealer.regionCity.slice(0, 80),
      applicationDateIso: dealer.applicationDateIso,
      approvalStatus: dealer.approvalStatus,
      wholesaleTier: dealer.wholesaleTier.slice(0, 80),
      creditLimit: dealer.creditLimit,
      availableCredit: dealer.availableCredit,
      rejectionReason: dealer.rejectionReason.slice(
        0,
        VALIDATION_CONSTRAINTS.REJECTION_REASON_MAX_LENGTH
      ),
      createdByUid: adminUid,
      createdAt: now,
      updatedAt: now,
    });

    const review = SEED_DEALER_REVIEW_DETAILS[dealer.id];
    if (review) {
      batch.set(doc(db, 'dealers', dealer.id, 'application_details', 'review'), {
        dealerDocId: dealer.id,
        applicantEmail: review.applicantEmail.slice(0, 160),
        applicantPhone: review.applicantPhone.slice(0, 24),
        registeredWarehouse: review.registeredWarehouse.slice(0, 320),
        annualProjectedVolumeInr: review.annualProjectedVolumeInr,
        applicantNotes: review.applicantNotes.slice(0, 500),
        createdAt: now,
        updatedAt: now,
      });
    }
    addedCount += 1;
  }

  for (const srv of DEMO_SERVICE_REQUESTS) {
    if (existingServiceIds.has(srv.id)) continue;
    if (!existingOrderIds.has(srv.orderId)) continue;
    assertValidDocId(srv.id, 'serviceRequest');

    batch.set(doc(db, 'service_requests', srv.id), {
      ticketNumber: srv.ticketNumber,
      orderId: srv.orderId,
      orderNumber: srv.orderNumber,
      customerUid: srv.customerUid,
      customerCode: srv.customerCode.slice(0, 40),
      customerDisplayName: srv.customerDisplayName.slice(0, 120),
      requestCategory: srv.requestCategory,
      serviceType: srv.serviceType,
      status: srv.status,
      regionCity: srv.regionCity.slice(0, 80),
      submissionDateIso: srv.submissionDateIso,
      scheduledDateIso: srv.scheduledDateIso,
      productModel: srv.productModel.slice(0, 160),
      requestDetails: srv.requestDetails.slice(
        0,
        VALIDATION_CONSTRAINTS.REQUEST_DETAILS_MAX_LENGTH
      ),
      resolutionNotes: srv.resolutionNotes.slice(
        0,
        VALIDATION_CONSTRAINTS.RESOLUTION_NOTES_MAX_LENGTH
      ),
      createdByUid: adminUid,
      createdAt: now,
      updatedAt: now,
    });

    const contact = SEED_SERVICE_PRIVATE_CONTACTS[srv.id];
    if (contact) {
      batch.set(doc(db, 'service_requests', srv.id, 'private_details', 'contact'), {
        requestId: srv.id,
        contactName: contact.contactName.slice(0, 120),
        phone: contact.phone.slice(0, 24),
        serviceAddress: contact.serviceAddress.slice(0, 320),
        waterSourceTdsPpm: contact.waterSourceTdsPpm,
        createdAt: now,
        updatedAt: now,
      });
    }
    addedCount += 1;
  }

  if (addedCount === 0) {
    return 0;
  }

  try {
    await batch.commit();
    return addedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dealers');
  }
}
