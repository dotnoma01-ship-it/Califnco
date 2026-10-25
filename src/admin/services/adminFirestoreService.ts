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
  SEED_PRIVATE_SHIPPING_BY_ORDER,
} from '../demoData';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  canSettleOrderPayment,
  VALIDATION_CONSTRAINTS,
  validateStatusTransition,
  type DealerSummary,
  type FulfilmentStatus,
  type OrderLineItem,
  type OrderPrivateDetails,
  type OrderSummary,
  type PaymentStatus,
  type ServiceRequest,
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
        return {
          id: docSnap.id,
          dealerCode: String(d.dealerCode ?? ''),
          ownerUid: String(d.ownerUid ?? ''),
          businessName: String(d.businessName ?? ''),
          regionCity: String(d.regionCity ?? ''),
          approvalStatus:
            d.approvalStatus === 'approved' || d.approvalStatus === 'rejected'
              ? d.approvalStatus
              : 'pending',
          wholesaleTier: String(d.wholesaleTier ?? ''),
          createdByUid: String(d.createdByUid ?? ''),
        };
      });
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
        return {
          id: docSnap.id,
          ticketNumber: String(d.ticketNumber ?? ''),
          orderId: String(d.orderId ?? ''),
          orderNumber: String(d.orderNumber ?? ''),
          customerUid: String(d.customerUid ?? ''),
          serviceType: (d.serviceType as ServiceRequest['serviceType']) ?? 'RO Installation',
          status: (d.status as ServiceRequest['status']) ?? 'open',
          regionCity: String(d.regionCity ?? ''),
          scheduledDateIso: String(d.scheduledDateIso ?? ''),
          createdByUid: String(d.createdByUid ?? ''),
        };
      });
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

export async function transitionOrderFulfilment(
  order: OrderSummary,
  nextStatus: FulfilmentStatus
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

  // Pre-dispatch cancellation of a settled order atomically marks paymentStatus as refunded
  if (nextStatus === 'cancelled' && order.paymentStatus === 'paid') {
    payload.paymentStatus = 'refunded';
  }

  try {
    await updateDoc(doc(db, 'orders', order.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, orderPath);
  }
}

export async function settleOrderPayment(order: OrderSummary): Promise<void> {
  assertValidDocId(order.id, 'order');
  if (!canSettleOrderPayment(order)) {
    throw new Error('Only active orders with COD or Net-30 credit can be marked as paid.');
  }

  const orderPath = `orders/${order.id}`;
  try {
    await updateDoc(doc(db, 'orders', order.id), {
      paymentStatus: 'paid',
      updatedAt: serverTimestamp(),
    });
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
    if (!VALIDATION_CONSTRAINTS.ORDER_NUMBER_PATTERN.test(order.orderNumber)) {
      throw new Error(`Invalid order number format: ${order.orderNumber}`);
    }

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
      ownerUid: dealer.ownerUid,
      businessName: dealer.businessName.slice(0, 140),
      regionCity: dealer.regionCity.slice(0, 80),
      approvalStatus: dealer.approvalStatus,
      wholesaleTier: dealer.wholesaleTier.slice(0, 80),
      createdByUid: adminUid,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const srv of DEMO_SERVICE_REQUESTS) {
    assertValidDocId(srv.id, 'serviceRequest');
    const srvRef = doc(db, 'service_requests', srv.id);
    batch.set(srvRef, {
      ticketNumber: srv.ticketNumber,
      orderId: srv.orderId,
      orderNumber: srv.orderNumber,
      customerUid: srv.customerUid,
      serviceType: srv.serviceType,
      status: srv.status,
      regionCity: srv.regionCity.slice(0, 80),
      scheduledDateIso: srv.scheduledDateIso,
      createdByUid: adminUid,
      createdAt: now,
      updatedAt: now,
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'orders');
  }
}
