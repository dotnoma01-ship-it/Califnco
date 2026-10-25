import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
} from './admin/firebase';
import type {
  ServiceRequestCategory,
  ServiceRequestType,
  ServiceTicketStatus,
} from './admin/types';

export interface MobileServiceBookingRecord {
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
  preferredDateIso: string;
  preferredTimeSlot: string;
  productId: string;
  productModel: string;
  requestDetails: string;
  resolutionNotes: string;
  serviceAddress: string;
  contactName: string;
  contactPhone: string;
  persistedToFirestore: boolean;
}

export interface ScheduleLookupResult {
  scheduleId: string;
  isConfigured: boolean;
  availableSlots: string[];
  source: 'firestore' | 'simulated_roster' | 'unconfigured';
}

export interface CreateMobileServiceBookingInput {
  category: ServiceRequestCategory;
  productId: string;
  productModel: string;
  issueDescription: string;
  streetAddress: string;
  cityState: string;
  postalCode: string;
  preferredDateIso: string;
  preferredTimeSlot: string;
  isScheduleConfigured: boolean;
  configuredSlots: string[];
  contactName: string;
  contactPhone: string;
  linkedOrderNumber?: string;
}

export const CONFIGURED_DISPATCH_SLOTS_PRESET: string[] = [
  '09:30 AM - 11:30 AM',
  '01:00 PM - 03:00 PM',
  '04:00 PM - 06:00 PM',
];

function mapCategoryToServiceType(
  category: ServiceRequestCategory,
  productId: string
): ServiceRequestType {
  if (category === 'Installation') {
    return 'RO Installation';
  }
  if (category === 'Maintenance') {
    return productId === 'fl-01' ? '6-Month Filter Check' : 'Preventive Maintenance';
  }
  if (productId === 'pm-01') {
    return 'Booster Pump Calibration';
  }
  return 'Purifier Repair';
}

export function buildScheduleDocId(dateIso: string, postalCode: string): string {
  const cleanDate = dateIso.trim();
  const cleanPin = postalCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(cleanDate) || cleanPin.length < 4) {
    return '';
  }
  return `${cleanDate}_${cleanPin}`.slice(0, 120);
}

export function validateMobileServiceBookingForm(
  input: CreateMobileServiceBookingInput
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (
    (input.category === 'Installation' || input.category === 'Repair') &&
    (!input.productModel.trim() || input.productId.trim() === 'none')
  ) {
    errors.product = `Please select the relevant Califnco product for ${input.category.toLowerCase()}.`;
  }

  const desc = input.issueDescription.trim();
  if (desc.length < 10) {
    errors.description =
      'Please describe the issue or service requirement (at least 10 characters).';
  } else if (desc.length > 600) {
    errors.description = 'Description must be 600 characters or fewer.';
  }

  const street = input.streetAddress.trim();
  if (street.length < 5 || street.length > 220) {
    errors.streetAddress = 'Please enter a valid flat/building and street address (5–220 chars).';
  }

  const cityState = input.cityState.trim();
  if (cityState.length < 2 || cityState.length > 80) {
    errors.cityState = 'Please enter a valid city and state.';
  }

  const pin = input.postalCode.trim();
  if (pin.length < 4 || pin.length > 16 || !/^[0-9A-Za-z\- ]+$/.test(pin)) {
    errors.postalCode = 'Enter a valid postal / PIN code (e.g. 400050).';
  }

  const dateIso = input.preferredDateIso.trim();
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateIso)) {
    errors.preferredDate = 'Select a valid preferred date (YYYY-MM-DD).';
  } else {
    const todayIso = new Date().toISOString().slice(0, 10);
    if (dateIso < todayIso) {
      errors.preferredDate = 'Preferred service date cannot be in the past.';
    }
  }

  if (input.preferredTimeSlot.trim()) {
    if (
      !input.isScheduleConfigured ||
      !input.configuredSlots.includes(input.preferredTimeSlot.trim())
    ) {
      errors.timeSlot =
        'Time slots can only be selected when supplied by an active scheduling configuration.';
    }
  }

  const contactName = input.contactName.trim();
  if (contactName.length < 2 || contactName.length > 120) {
    errors.contactName = 'Enter the on-site contact person name (2–120 chars).';
  }

  const phoneTrimmed = input.contactPhone.trim();
  const digitsOnly = phoneTrimmed.replace(/[^0-9]/g, '');
  if (
    digitsOnly.length < 10 ||
    digitsOnly.length > 15 ||
    phoneTrimmed.length < 7 ||
    phoneTrimmed.length > 24
  ) {
    errors.contactPhone = 'Enter a valid 10-digit mobile / contact number.';
  }

  return errors;
}

/**
 * Queries /service_schedules/{dateIso}_{postalCode} for configured technician slots.
 * Never fabricates time slots when no active schedule document exists.
 */
export async function fetchConfiguredScheduleSlots(
  dateIso: string,
  postalCode: string,
  simulatedScheduleEnabled: boolean
): Promise<ScheduleLookupResult> {
  const scheduleId = buildScheduleDocId(dateIso, postalCode);
  if (!scheduleId) {
    return {
      scheduleId: '',
      isConfigured: false,
      availableSlots: [],
      source: 'unconfigured',
    };
  }

  const currentUser = auth.currentUser;
  if (isFirebaseConfigured && currentUser && currentUser.emailVerified) {
    const path = `service_schedules/${scheduleId}`;
    try {
      const snap = await getDoc(doc(db, 'service_schedules', scheduleId));
      if (snap.exists()) {
        const data = snap.data();
        const isActive = data.isActive === true;
        const rawSlots = Array.isArray(data.availableSlots) ? data.availableSlots : [];
        const validSlots = rawSlots
          .filter((s): s is string => typeof s === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length >= 3 && s.length <= 40);

        if (isActive && validSlots.length > 0) {
          return {
            scheduleId,
            isConfigured: true,
            availableSlots: validSlots,
            source: 'firestore',
          };
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!msg.includes('offline')) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  }

  if (simulatedScheduleEnabled) {
    return {
      scheduleId,
      isConfigured: true,
      availableSlots: CONFIGURED_DISPATCH_SLOTS_PRESET,
      source: 'simulated_roster',
    };
  }

  return {
    scheduleId,
    isConfigured: false,
    availableSlots: [],
    source: 'unconfigured',
  };
}

/**
 * Allows an authenticated administrator testing Screen 23 to publish or remove
 * a live /service_schedules/{scheduleId} document in Cloud Firestore.
 */
export async function setFirestoreScheduleConfigForTesting(params: {
  dateIso: string;
  postalCode: string;
  enable: boolean;
}): Promise<boolean> {
  const user = auth.currentUser;
  const scheduleId = buildScheduleDocId(params.dateIso, params.postalCode);
  if (!isFirebaseConfigured || !user || !user.emailVerified || !scheduleId) {
    return false;
  }

  const path = `service_schedules/${scheduleId}`;
  try {
    const ref = doc(db, 'service_schedules', scheduleId);
    if (!params.enable) {
      await deleteDoc(ref);
      return true;
    }
    await setDoc(ref, {
      scheduleId,
      dateIso: params.dateIso.trim(),
      postalCode: params.postalCode.trim().slice(0, 16),
      isActive: true,
      availableSlots: CONFIGURED_DISPATCH_SLOTS_PRESET,
      updatedByUid: user.uid,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch {
    // Non-admin customers cannot write to /service_schedules; caller falls back to UI simulation toggle.
    return false;
  }
}

/**
 * Validates and persists a Screen 23 Service Booking request to Cloud Firestore
 * when signed in (atomic batch across /service_requests/{id} and private_details/contact),
 * always creating status: 'open' so unconfirmed slots are never misrepresented as confirmed appointments.
 */
export async function submitMobileServiceBooking(
  input: CreateMobileServiceBookingInput
): Promise<MobileServiceBookingRecord> {
  const validationErrors = validateMobileServiceBookingForm(input);
  const firstError = Object.values(validationErrors)[0];
  if (firstError) {
    throw new Error(firstError);
  }

  const now = new Date();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const requestId = `srv-${now.getTime()}-${suffix}`;
  const ticketNumber = `SRV-${now.getUTCFullYear()}-${suffix}`;

  const fullAddress = `${input.streetAddress.trim()}, ${input.cityState.trim()} - ${input.postalCode.trim()}`.slice(
    0,
    320
  );
  const regionCity = input.cityState.trim().slice(0, 80);
  const cleanProductId =
    input.productId && input.productId !== 'none'
      ? input.productId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
      : '';
  const cleanProductModel = (
    input.productModel.trim() || 'General Califnco Water Purification System'
  ).slice(0, 160);
  const cleanSlot =
    input.isScheduleConfigured &&
    input.configuredSlots.includes(input.preferredTimeSlot.trim())
      ? input.preferredTimeSlot.trim().slice(0, 60)
      : '';

  const sanitizedOrderNumber =
    input.linkedOrderNumber && /^[A-Z0-9-]{5,40}$/.test(input.linkedOrderNumber.trim())
      ? input.linkedOrderNumber.trim()
      : 'DIRECT-BOOKING';

  const serviceType = mapCategoryToServiceType(input.category, cleanProductId);
  const submissionDateIso = now.toISOString();

  const currentUser = auth.currentUser;
  if (isFirebaseConfigured && currentUser && currentUser.emailVerified) {
    const cleanUidPrefix = currentUser.uid
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6)
      .padEnd(4, 'X');
    const customerCode = `CUST-${cleanUidPrefix}`;
    const contactName = input.contactName.trim().slice(0, 120);
    const contactPhone = input.contactPhone.trim().slice(0, 24);

    const requestRef = doc(db, 'service_requests', requestId);
    const contactRef = doc(db, 'service_requests', requestId, 'private_details', 'contact');

    try {
      const batch = writeBatch(db);
      batch.set(requestRef, {
        ticketNumber,
        orderId: 'DIRECT-SERVICE',
        orderNumber: sanitizedOrderNumber,
        customerUid: currentUser.uid,
        customerCode,
        customerDisplayName: contactName,
        requestCategory: input.category,
        serviceType,
        status: 'open',
        regionCity,
        submissionDateIso,
        scheduledDateIso: input.preferredDateIso.trim(),
        preferredTimeSlot: cleanSlot,
        productId: cleanProductId,
        productModel: cleanProductModel,
        requestDetails: input.issueDescription.trim().slice(0, 600),
        resolutionNotes: '',
        createdByUid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(contactRef, {
        requestId,
        contactName,
        phone: contactPhone,
        serviceAddress: fullAddress,
        waterSourceTdsPpm: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      return {
        id: requestId,
        ticketNumber,
        orderId: 'DIRECT-SERVICE',
        orderNumber: sanitizedOrderNumber,
        customerUid: currentUser.uid,
        customerCode,
        customerDisplayName: contactName,
        requestCategory: input.category,
        serviceType,
        status: 'open',
        regionCity,
        submissionDateIso,
        preferredDateIso: input.preferredDateIso.trim(),
        preferredTimeSlot: cleanSlot,
        productId: cleanProductId,
        productModel: cleanProductModel,
        requestDetails: input.issueDescription.trim().slice(0, 600),
        resolutionNotes: '',
        serviceAddress: fullAddress,
        contactName,
        contactPhone,
        persistedToFirestore: true,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `service_requests/${requestId}`);
    }
  }

  // Unauthenticated simulator sandbox fallback (clearly flagged with persistedToFirestore: false)
  return {
    id: requestId,
    ticketNumber,
    orderId: 'DIRECT-SERVICE',
    orderNumber: sanitizedOrderNumber,
    customerUid: 'user_sarah',
    customerCode: 'CUST-SARAH1',
    customerDisplayName: input.contactName.trim().slice(0, 120),
    requestCategory: input.category,
    serviceType,
    status: 'open',
    regionCity,
    submissionDateIso,
    preferredDateIso: input.preferredDateIso.trim(),
    preferredTimeSlot: cleanSlot,
    productId: cleanProductId,
    productModel: cleanProductModel,
    requestDetails: input.issueDescription.trim().slice(0, 600),
    resolutionNotes: '',
    serviceAddress: fullAddress,
    contactName: input.contactName.trim().slice(0, 120),
    contactPhone: input.contactPhone.trim().slice(0, 24),
    persistedToFirestore: false,
  };
}

/**
 * Streams the signed-in customer's own service requests from Cloud Firestore
 * (enforced by allow list: resource.data.customerUid == request.auth.uid).
 */
export function subscribeCustomerServiceRequests(
  customerUid: string,
  callbacks: {
    onRequests: (records: MobileServiceBookingRecord[]) => void;
    onError?: (err: string) => void;
  }
): Unsubscribe {
  const path = 'service_requests';
  const q = query(collection(db, path), where('customerUid', '==', customerUid));

  return onSnapshot(
    q,
    async (snapshot) => {
      const mapped: MobileServiceBookingRecord[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const d = docSnap.data();
          let serviceAddress = String(d.regionCity ?? '');
          let contactPhone = '';
          let contactName = String(d.customerDisplayName ?? 'Customer');

          try {
            const contactSnap = await getDoc(
              doc(db, 'service_requests', docSnap.id, 'private_details', 'contact')
            );
            if (contactSnap.exists()) {
              const cd = contactSnap.data();
              serviceAddress = String(cd.serviceAddress ?? serviceAddress);
              contactPhone = String(cd.phone ?? '');
              contactName = String(cd.contactName ?? contactName);
            }
          } catch {
            // Keep summary fields if contact subdoc fetch is skipped
          }

          const createdIso =
            d.createdAt instanceof Timestamp
              ? d.createdAt.toDate().toISOString()
              : String(d.submissionDateIso ?? '');

          const catRaw = String(d.requestCategory ?? 'Maintenance');
          const requestCategory: ServiceRequestCategory =
            catRaw === 'Installation' || catRaw === 'Maintenance' || catRaw === 'Repair'
              ? catRaw
              : 'Maintenance';

          const statusRaw = String(d.status ?? 'open');
          const status: ServiceTicketStatus =
            statusRaw === 'open' ||
            statusRaw === 'scheduled' ||
            statusRaw === 'in_progress' ||
            statusRaw === 'completed' ||
            statusRaw === 'cancelled'
              ? statusRaw
              : 'open';

          return {
            id: docSnap.id,
            ticketNumber: String(d.ticketNumber ?? docSnap.id.toUpperCase()),
            orderId: String(d.orderId ?? 'DIRECT-SERVICE'),
            orderNumber: String(d.orderNumber ?? 'DIRECT-BOOKING'),
            customerUid: String(d.customerUid ?? customerUid),
            customerCode: String(d.customerCode ?? 'CUST-USER'),
            customerDisplayName: String(d.customerDisplayName ?? contactName),
            requestCategory,
            serviceType: (d.serviceType as ServiceRequestType) ?? 'Preventive Maintenance',
            status,
            regionCity: String(d.regionCity ?? ''),
            submissionDateIso: String(d.submissionDateIso ?? createdIso),
            preferredDateIso: String(d.scheduledDateIso ?? ''),
            preferredTimeSlot: String(d.preferredTimeSlot ?? ''),
            productId: String(d.productId ?? ''),
            productModel: String(d.productModel ?? 'Califnco Water System'),
            requestDetails: String(d.requestDetails ?? ''),
            resolutionNotes: String(d.resolutionNotes ?? ''),
            serviceAddress,
            contactName,
            contactPhone,
            persistedToFirestore: true,
          };
        })
      );

      mapped.sort((a, b) => (b.submissionDateIso || '').localeCompare(a.submissionDateIso || ''));
      callbacks.onRequests(mapped);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        callbacks.onError?.(
          formatted instanceof Error ? formatted.message : String(formatted)
        );
      }
    }
  );
}
