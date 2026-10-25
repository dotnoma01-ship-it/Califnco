export type AdminPageId = 'dashboard' | 'orders' | 'dealers' | 'service';

export type OrderChannel = 'customer' | 'dealer';

export type PaymentStatus = 'paid' | 'credit_net30' | 'cod_pending' | 'razorpay_pending' | 'refunded';

export type FulfilmentStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export type DealerApprovalStatus = 'approved' | 'pending' | 'rejected';

export type DealerBusinessType =
  | 'Distributor'
  | 'Retail Franchise'
  | 'Commercial Integrator'
  | 'Service Franchise';

export type ServiceRequestCategory = 'Installation' | 'Maintenance' | 'Repair';

export type ServiceRequestType =
  | 'RO Installation'
  | 'Preventive Maintenance'
  | '6-Month Filter Check'
  | 'Purifier Repair'
  | 'Booster Pump Calibration'
  | 'Warranty Repair';

export type ServiceTicketStatus =
  | 'open'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

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
  GSTIN_PATTERN: /^[0-9A-Z]+$/,
  GSTIN_MIN_LENGTH: 15,
  GSTIN_MAX_LENGTH: 20,
  DISPATCH_NOTES_MAX_LENGTH: 400,
  REJECTION_REASON_MIN_LENGTH: 5,
  REJECTION_REASON_MAX_LENGTH: 400,
  RESOLUTION_NOTES_MIN_CLOSING_LENGTH: 5,
  RESOLUTION_NOTES_MAX_LENGTH: 600,
  REQUEST_DETAILS_MAX_LENGTH: 600,
  DEALER_CREDIT_MIN_APPROVED: 50000,
  DEALER_CREDIT_MAX_APPROVED: 10000000,
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
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentVerifiedSource?: 'razorpay_signature_verify' | 'razorpay_webhook' | 'admin_manual';
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
  dealerId: string;
  ownerUid: string;
  businessName: string;
  contactPerson: string;
  gstin: string;
  businessType: DealerBusinessType;
  regionCity: string;
  applicationDateIso: string;
  approvalStatus: DealerApprovalStatus;
  wholesaleTier: string;
  creditLimit: number;
  availableCredit: number;
  rejectionReason: string;
  reviewedByUid?: string;
  reviewedAtIso?: string;
  createdByUid: string;
  updatedAtIso?: string;
}

export interface DealerApplicationReviewDetails {
  dealerDocId: string;
  applicantEmail: string;
  applicantPhone: string;
  registeredWarehouse: string;
  annualProjectedVolumeInr: number;
  applicantNotes: string;
}

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderNumber: string;
  customerUid: string;
  customerCode: string;
  customerDisplayName: string;
  requestCategory: ServiceRequestCategory;
  serviceType: ServiceRequestType;
  status: ServiceTicketStatus;
  regionCity: string;
  submissionDateIso: string;
  scheduledDateIso: string;
  preferredTimeSlot?: string;
  productId?: string;
  productModel: string;
  requestDetails: string;
  resolutionNotes: string;
  updatedByUid?: string;
  createdByUid: string;
  updatedAtIso?: string;
}

export interface ServiceRequestPrivateContact {
  requestId: string;
  contactName: string;
  phone: string;
  serviceAddress: string;
  waterSourceTdsPpm: number;
}

export const WHOLESALE_TIER_PRESETS: Array<{
  tierLabel: string;
  defaultCreditLimit: number;
  marginSummary: string;
}> = [
  {
    tierLabel: 'Tier 1 Platinum Partner',
    defaultCreditLimit: 500000,
    marginSummary: '38% – 52% wholesale margin · Net-30 credit',
  },
  {
    tierLabel: 'Tier 2 Gold Partner',
    defaultCreditLimit: 300000,
    marginSummary: '30% – 42% wholesale margin · Net-30 credit',
  },
  {
    tierLabel: 'Tier 3 Standard Partner',
    defaultCreditLimit: 150000,
    marginSummary: '22% – 32% wholesale margin · Net-30 credit',
  },
];

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

export const ALLOWED_SERVICE_TRANSITIONS: Record<ServiceTicketStatus, ServiceTicketStatus[]> = {
  open: ['scheduled', 'in_progress', 'cancelled'],
  scheduled: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function isTerminalServiceStatus(status: ServiceTicketStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function validateServiceStatusTransition(
  currentStatus: ServiceTicketStatus,
  nextStatus: ServiceTicketStatus,
  resolutionNotes: string
): { valid: boolean; reason?: string } {
  if (isTerminalServiceStatus(currentStatus)) {
    return {
      valid: false,
      reason: `Tickets in terminal status "${currentStatus}" are locked and cannot be modified.`,
    };
  }

  if (currentStatus !== nextStatus) {
    const allowed = ALLOWED_SERVICE_TRANSITIONS[currentStatus];
    if (!allowed.includes(nextStatus)) {
      return {
        valid: false,
        reason: `Invalid transition from "${currentStatus}" to "${nextStatus}". Allowed next steps: ${allowed.join(', ') || 'none'}.`,
      };
    }
  }

  const trimmedNotes = resolutionNotes.trim();
  if (
    (nextStatus === 'completed' || nextStatus === 'cancelled') &&
    trimmedNotes.length < VALIDATION_CONSTRAINTS.RESOLUTION_NOTES_MIN_CLOSING_LENGTH
  ) {
    return {
      valid: false,
      reason: `Resolution notes (at least ${VALIDATION_CONSTRAINTS.RESOLUTION_NOTES_MIN_CLOSING_LENGTH} characters) are required before marking a request as ${nextStatus === 'completed' ? 'resolved' : 'cancelled'}.`,
    };
  }

  return { valid: true };
}

export function inferServiceCategory(serviceType: ServiceRequestType): ServiceRequestCategory {
  if (serviceType === 'RO Installation') {
    return 'Installation';
  }
  if (serviceType === 'Preventive Maintenance' || serviceType === '6-Month Filter Check') {
    return 'Maintenance';
  }
  return 'Repair';
}

export const DEALER_APPROVAL_META: Record<
  DealerApprovalStatus,
  { label: string; toneClass: string }
> = {
  pending: {
    label: 'Pending Review',
    toneClass: 'text-amber-700 font-semibold',
  },
  approved: {
    label: 'Approved Partner',
    toneClass: 'text-emerald-700 font-semibold',
  },
  rejected: {
    label: 'Rejected',
    toneClass: 'text-red-700 font-medium',
  },
};

export const SERVICE_STATUS_META: Record<
  ServiceTicketStatus,
  { label: string; actionVerb: string; toneClass: string }
> = {
  open: {
    label: 'Open (Unscheduled)',
    actionVerb: 'Keep Open',
    toneClass: 'text-amber-700 font-semibold',
  },
  scheduled: {
    label: 'Technician Scheduled',
    actionVerb: 'Schedule Visit',
    toneClass: 'text-sky-800 font-medium',
  },
  in_progress: {
    label: 'In Progress (On-Site)',
    actionVerb: 'Mark In Progress',
    toneClass: 'text-teal-800 font-semibold',
  },
  completed: {
    label: 'Resolved (Final)',
    actionVerb: 'Mark Resolved',
    toneClass: 'text-emerald-700 font-semibold',
  },
  cancelled: {
    label: 'Cancelled (Final)',
    actionVerb: 'Cancel Request',
    toneClass: 'text-red-700 font-medium',
  },
};

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
  razorpay_pending: {
    label: 'Razorpay Pending (Unverified)',
    toneClass: 'text-amber-700 font-semibold',
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
  if (!iso) return '—';
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
