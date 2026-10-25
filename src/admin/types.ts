export type AdminPageId = 'dashboard' | 'orders';

export type OrderChannel = 'customer' | 'dealer';

export type PaymentStatus = 'paid' | 'credit_net30' | 'cod_pending' | 'refunded';

export type FulfilmentStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export type DealerApprovalStatus = 'approved' | 'pending' | 'rejected';

export type ServiceTicketStatus = 'open' | 'scheduled' | 'completed' | 'cancelled';

export type ProductCategory =
  | 'Water Purifiers'
  | 'Dispensers'
  | 'Pumps'
  | 'Filters'
  | 'Spare Parts';

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const VALIDATION_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  ID_MAX_LENGTH: 128,
  ORDER_NUMBER_PATTERN: /^[A-Z0-9-]+$/,
  ORDER_NUMBER_MIN_LENGTH: 5,
  ORDER_NUMBER_MAX_LENGTH: 40,
  PARTY_ID_MIN_LENGTH: 3,
  PARTY_ID_MAX_LENGTH: 40,
  PARTY_NAME_MIN_LENGTH: 2,
  PARTY_NAME_MAX_LENGTH: 120,
  REGION_CITY_MIN_LENGTH: 2,
  REGION_CITY_MAX_LENGTH: 80,
  SHIPPING_ADDRESS_MIN_LENGTH: 5,
  SHIPPING_ADDRESS_MAX_LENGTH: 320,
  POSTAL_CODE_PATTERN: /^[0-9A-Za-z\- ]+$/,
  POSTAL_CODE_MIN_LENGTH: 4,
  POSTAL_CODE_MAX_LENGTH: 16,
  GSTIN_MAX_LENGTH: 20,
  DISPATCH_NOTES_MAX_LENGTH: 400,
} as const;

export interface OrderSummary {
  id: string;
  orderNumber: string;
  channel: OrderChannel;
  customerUid: string;
  partyId: string;
  partyDisplayName: string;
  regionCity: string;
  orderDateIso: string;
  itemCount: number;
  subtotalAmount: number;
  deliveryAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  createdByUid: string;
  updatedAtIso?: string;
}

export interface OrderLineItem {
  id: string;
  orderId: string;
  customerUid: string;
  sku: string;
  productName: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderPrivateDetails {
  orderId: string;
  recipientName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  postalCode: string;
  gstin: string;
  dispatchNotes: string;
}

export interface DealerSummary {
  id: string;
  dealerCode: string;
  ownerUid: string;
  businessName: string;
  regionCity: string;
  approvalStatus: DealerApprovalStatus;
  wholesaleTier: string;
  createdByUid: string;
}

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderNumber: string;
  customerUid: string;
  serviceType:
    | 'RO Installation'
    | '6-Month Filter Check'
    | 'Booster Pump Calibration'
    | 'Warranty Repair';
  status: ServiceTicketStatus;
  regionCity: string;
  scheduledDateIso: string;
  createdByUid: string;
}

export const FULFILMENT_LIFECYCLE_ORDER: FulfilmentStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'dispatched',
  'delivered',
  'cancelled',
];

export const ALLOWED_FULFILMENT_TRANSITIONS: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function isTerminalFulfilmentStatus(status: FulfilmentStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}

export function validateStatusTransition(
  currentStatus: FulfilmentStatus,
  nextStatus: FulfilmentStatus
): { valid: boolean; reason?: string } {
  if (currentStatus === nextStatus) {
    return { valid: false, reason: 'Order is already in the requested status.' };
  }
  if (isTerminalFulfilmentStatus(currentStatus)) {
    return {
      valid: false,
      reason: `Orders in terminal status "${currentStatus}" are locked and cannot be transitioned.`,
    };
  }
  const allowed = ALLOWED_FULFILMENT_TRANSITIONS[currentStatus];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Invalid transition from "${currentStatus}" to "${nextStatus}". Allowed next states: ${allowed.join(', ') || 'none'}.`,
    };
  }
  return { valid: true };
}

export function canSettleOrderPayment(order: OrderSummary): boolean {
  if (order.fulfilmentStatus === 'cancelled') return false;
  return order.paymentStatus === 'cod_pending' || order.paymentStatus === 'credit_net30';
}

export const FULFILMENT_STATUS_META: Record<
  FulfilmentStatus,
  { label: string; actionVerb: string; toneClass: string }
> = {
  pending: {
    label: 'Pending Review',
    actionVerb: 'Pending',
    toneClass: 'text-amber-700 font-medium',
  },
  confirmed: {
    label: 'Confirmed',
    actionVerb: 'Confirm Order',
    toneClass: 'text-slate-800 font-medium',
  },
  processing: {
    label: 'Warehouse Processing',
    actionVerb: 'Start Processing',
    toneClass: 'text-sky-800 font-medium',
  },
  dispatched: {
    label: 'Dispatched in Transit',
    actionVerb: 'Mark Dispatched',
    toneClass: 'text-teal-800 font-medium',
  },
  delivered: {
    label: 'Delivered (Final)',
    actionVerb: 'Mark Delivered',
    toneClass: 'text-emerald-700 font-semibold',
  },
  cancelled: {
    label: 'Cancelled (Final)',
    actionVerb: 'Cancel Order',
    toneClass: 'text-red-700 font-medium',
  },
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; toneClass: string }
> = {
  paid: {
    label: 'Paid Settled',
    toneClass: 'text-emerald-700 font-medium',
  },
  credit_net30: {
    label: 'Net-30 Dealer Credit',
    toneClass: 'text-amber-700 font-medium',
  },
  cod_pending: {
    label: 'COD Due on Delivery',
    toneClass: 'text-amber-700 font-medium',
  },
  refunded: {
    label: 'Refunded',
    toneClass: 'text-slate-600 font-medium',
  },
};

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
