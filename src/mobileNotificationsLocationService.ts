import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported as isFcmBrowserSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import {
  app,
  auth,
  db,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
} from './admin/firebase';

export type NotificationEventType =
  | 'order_confirmed'
  | 'order_processing'
  | 'order_dispatched'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_settled'
  | 'service_scheduled'
  | 'system_notice';

export interface MobileNotificationItem {
  id: string;
  recipientUid: string;
  title: string;
  body: string;
  eventType: NotificationEventType;
  orderId?: string;
  orderNumber?: string;
  source:
    | 'trusted_backend_order_event'
    | 'trusted_admin_console_event'
    | 'fcm_remote_sync'
    | 'demo_preview';
  isRead: boolean;
  createdAtIso: string;
  readAtIso?: string;
  persistedToFirestore: boolean;
}

export type FcmRuntimeMode =
  | 'unsupported_browser'
  | 'permission_default'
  | 'permission_denied'
  | 'unauthenticated_user'
  | 'vapid_or_sw_unconfigured'
  | 'registered_live_fcm';

export interface WebFcmStatusSnapshot {
  mode: FcmRuntimeMode;
  browserPermission: NotificationPermission | 'unsupported';
  isPushRegistered: boolean;
  deviceId: string;
  summaryTitle: string;
  detailMessage: string;
}

export type LocationCaptureSource = 'map_pin' | 'gps_pin' | 'manual_only';

export type AddressVerificationStatus =
  | 'unverified_manual_entry'
  | 'postal_verified_backend';

export interface SavedDeliveryLocationRecord {
  addressId: string;
  userId: string;
  label: 'Home' | 'Work' | 'Other';
  recipientName: string;
  phone: string;
  streetAddress: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions: string;
  isDefault: boolean;
  hasCoordinates: boolean;
  latitude: number;
  longitude: number;
  locationSource: LocationCaptureSource;
  addressVerificationStatus: AddressVerificationStatus;
  createdAtIso: string;
  persistedToFirestore: boolean;
}

export interface SaveDeliveryLocationInput {
  label: 'Home' | 'Work' | 'Other';
  recipientName: string;
  phone: string;
  streetAddress: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions: string;
  isDefault: boolean;
  hasCoordinates: boolean;
  latitude: number;
  longitude: number;
  locationSource: LocationCaptureSource;
}

const DEVICE_STORAGE_KEY = 'califnco_web_device_id_v1';

export function getOrCreateWebDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,128}$/.test(existing)) {
      return existing;
    }
    const randomPart = Math.random().toString(36).slice(2, 12);
    const created = `webdev_${Date.now()}_${randomPart}`;
    window.localStorage.setItem(DEVICE_STORAGE_KEY, created);
    return created;
  } catch {
    return 'webdev_ephemeral_session_01';
  }
}

export const DEMO_PREVIEW_NOTIFICATIONS: MobileNotificationItem[] = [
  {
    id: 'notif-demo-101',
    recipientUid: 'user_sarah',
    title: 'Order CALIF-82941 Dispatched',
    body: 'Your Califnco Hydra Pure Elite RO+UV+Copper shipment has left the Mumbai regional warehouse via Califnco Logistics.',
    eventType: 'order_dispatched',
    orderId: 'ord-82941',
    orderNumber: 'CALIF-82941',
    source: 'demo_preview',
    isRead: false,
    createdAtIso: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    persistedToFirestore: false,
  },
  {
    id: 'notif-demo-102',
    recipientUid: 'user_sarah',
    title: 'Payment Settled for CALIF-82941',
    body: 'Prepaid payment of ₹21,497 for order CALIF-82941 has been verified and recorded.',
    eventType: 'payment_settled',
    orderId: 'ord-82941',
    orderNumber: 'CALIF-82941',
    source: 'demo_preview',
    isRead: false,
    createdAtIso: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    persistedToFirestore: false,
  },
  {
    id: 'notif-demo-103',
    recipientUid: 'user_sarah',
    title: 'Order CALIF-71024 Delivered',
    body: 'Order CALIF-71024 was delivered in Mumbai. You can schedule preventive 6-month filter care anytime from Service Booking.',
    eventType: 'order_delivered',
    orderId: 'ord-71024',
    orderNumber: 'CALIF-71024',
    source: 'demo_preview',
    isRead: true,
    createdAtIso: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
    readAtIso: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    persistedToFirestore: false,
  },
];

/**
 * Streams trusted notifications for the authenticated user from `/notifications`
 * (enforced by Firestore rule `resource.data.recipientUid == request.auth.uid`).
 */
export function subscribeUserNotifications(
  recipientUid: string,
  callbacks: {
    onNotifications: (items: MobileNotificationItem[]) => void;
    onError?: (err: string) => void;
  }
): Unsubscribe {
  const path = 'notifications';
  const q = query(collection(db, path), where('recipientUid', '==', recipientUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MobileNotificationItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdIso =
          d.createdAt instanceof Timestamp
            ? d.createdAt.toDate().toISOString()
            : String(d.createdAtIso ?? new Date().toISOString());
        const readIso =
          d.readAt instanceof Timestamp ? d.readAt.toDate().toISOString() : undefined;

        const rawType = String(d.eventType ?? 'system_notice') as NotificationEventType;
        const rawSource = String(d.source ?? 'trusted_backend_order_event');

        return {
          id: docSnap.id,
          recipientUid: String(d.recipientUid ?? recipientUid),
          title: String(d.title ?? 'Califnco Notification'),
          body: String(d.body ?? ''),
          eventType: rawType,
          orderId: d.orderId ? String(d.orderId) : undefined,
          orderNumber: d.orderNumber ? String(d.orderNumber) : undefined,
          source:
            rawSource === 'trusted_admin_console_event' || rawSource === 'fcm_remote_sync'
              ? rawSource
              : 'trusted_backend_order_event',
          isRead: d.isRead === true,
          createdAtIso: createdIso,
          readAtIso: readIso,
          persistedToFirestore: true,
        };
      });

      items.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
      callbacks.onNotifications(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        callbacks.onError?.(formatted instanceof Error ? formatted.message : String(formatted));
      }
    }
  );
}

/**
 * Marks a single Firestore notification as read (`isRead: false -> true`).
 */
export async function markUserNotificationAsRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllUserNotificationsAsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const id of notificationIds) {
      batch.update(doc(db, 'notifications', id), {
        isRead: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

/**
 * Inspects real browser Notification + Firebase Cloud Messaging support without
 * fabricating push registration or tokens.
 */
export async function inspectWebFcmStatus(user: User | null): Promise<WebFcmStatusSnapshot> {
  const deviceId = getOrCreateWebDeviceId();
  const hasNotificationApi = typeof window !== 'undefined' && 'Notification' in window;
  const fcmSupported = await isFcmBrowserSupported().catch(() => false);

  if (!hasNotificationApi || !fcmSupported) {
    return {
      mode: 'unsupported_browser',
      browserPermission: 'unsupported',
      isPushRegistered: false,
      deviceId,
      summaryTitle: 'In-App Firestore Inbox Active · OS Push Unsupported',
      detailMessage:
        'This browser/iframe context does not expose PushManager/ServiceWorker APIs. Live order notifications stream via Firestore; push delivery is not fabricated.',
    };
  }

  const perm = window.Notification.permission;
  if (perm === 'denied') {
    return {
      mode: 'permission_denied',
      browserPermission: 'denied',
      isPushRegistered: false,
      deviceId,
      summaryTitle: 'Notification Permission Denied',
      detailMessage:
        'Browser notification permission is blocked. In-app Firestore notifications remain active, while background FCM push tokens are not registered.',
    };
  }

  if (perm === 'default') {
    return {
      mode: 'permission_default',
      browserPermission: 'default',
      isPushRegistered: false,
      deviceId,
      summaryTitle: 'Push Permission Not Yet Requested',
      detailMessage:
        'Tap Request Push Permission to request OS/browser notification access and attempt FCM device token registration.',
    };
  }

  // Permission is 'granted'
  if (!isFirebaseConfigured || !user || !user.emailVerified) {
    return {
      mode: 'unauthenticated_user',
      browserPermission: 'granted',
      isPushRegistered: false,
      deviceId,
      summaryTitle: 'Permission Granted · Connect Auth to Register Token',
      detailMessage:
        'Browser notifications are allowed, but a verified Firebase Auth user is required to store an owner-isolated FCM token in /users/{uid}/fcm_tokens.',
    };
  }

  const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim();
  if (!vapidKey) {
    return {
      mode: 'vapid_or_sw_unconfigured',
      browserPermission: 'granted',
      isPushRegistered: false,
      deviceId,
      summaryTitle: 'In-App Inbox Live · Web Push VAPID Key Unconfigured',
      detailMessage:
        'Permission is granted, but VITE_FIREBASE_VAPID_KEY is not configured for Web Push. No push delivery is fabricated; native Android/iOS FCM registration is provided in fcm_notification_service.dart.',
    };
  }

  return registerWebFcmDeviceToken(user, vapidKey);
}

export async function requestWebNotificationPermissionAndSync(
  user: User | null
): Promise<WebFcmStatusSnapshot> {
  const deviceId = getOrCreateWebDeviceId();
  const hasNotificationApi = typeof window !== 'undefined' && 'Notification' in window;
  const fcmSupported = await isFcmBrowserSupported().catch(() => false);

  if (!hasNotificationApi || !fcmSupported) {
    return inspectWebFcmStatus(user);
  }

  let perm: NotificationPermission = window.Notification.permission;
  try {
    perm = await window.Notification.requestPermission();
  } catch {
    return {
      mode: 'unsupported_browser',
      browserPermission: window.Notification.permission,
      isPushRegistered: false,
      deviceId,
      summaryTitle: 'Permission Prompt Restricted by Preview Frame',
      detailMessage:
        'Cross-origin iframe security policy prevented the browser Notification permission dialog. Open in a top-level tab or run the Flutter Android/iOS target for OS push registration.',
    };
  }

  if (perm !== 'granted') {
    return inspectWebFcmStatus(user);
  }

  const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim();
  if (!isFirebaseConfigured || !user || !user.emailVerified || !vapidKey) {
    return inspectWebFcmStatus(user);
  }

  return registerWebFcmDeviceToken(user, vapidKey);
}

async function registerWebFcmDeviceToken(
  user: User,
  vapidKey: string
): Promise<WebFcmStatusSnapshot> {
  const deviceId = getOrCreateWebDeviceId();
  try {
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey });
    if (!token || token.trim().length < 20) {
      return {
        mode: 'vapid_or_sw_unconfigured',
        browserPermission: 'granted',
        isPushRegistered: false,
        deviceId,
        summaryTitle: 'FCM Token Unavailable',
        detailMessage:
          'FCM getToken() returned empty. Verify firebase-messaging-sw.js and Web Push certificate in Firebase Console.',
      };
    }

    const tokenRef = doc(db, 'users', user.uid, 'fcm_tokens', deviceId);
    const existing = await getDoc(tokenRef);
    if (existing.exists()) {
      await updateDoc(tokenRef, {
        fcmToken: token.trim(),
        platform: 'web',
        permissionStatus: 'authorized',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(tokenRef, {
        userId: user.uid,
        deviceId,
        fcmToken: token.trim(),
        platform: 'web',
        permissionStatus: 'authorized',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return {
      mode: 'registered_live_fcm',
      browserPermission: 'granted',
      isPushRegistered: true,
      deviceId,
      summaryTitle: 'FCM Device Token Registered',
      detailMessage: `Token securely stored at /users/${user.uid}/fcm_tokens/${deviceId}. Foreground & background FCM listeners active.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      mode: 'vapid_or_sw_unconfigured',
      browserPermission: 'granted',
      isPushRegistered: false,
      deviceId,
      summaryTitle: 'FCM Registration Requires Service Worker',
      detailMessage: `Push token registration was not completed (${msg.slice(0, 110)}). Live Firestore notifications remain active.`,
    };
  }
}

export async function attachForegroundFcmListener(
  onPayload: (payload: MessagePayload) => void
): Promise<Unsubscribe | null> {
  const supported = await isFcmBrowserSupported().catch(() => false);
  if (!supported || !isFirebaseConfigured) return null;
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      onPayload(payload);
    });
  } catch {
    return null;
  }
}

/**
 * Revokes the current device's FCM registration document BEFORE sign-out so
 * logged-out devices never retain active push routing for a previous user.
 */
export async function revokeWebDeviceTokenOnSignOut(uid: string): Promise<void> {
  if (!isFirebaseConfigured || !uid) return;
  const deviceId = getOrCreateWebDeviceId();
  try {
    await deleteDoc(doc(db, 'users', uid, 'fcm_tokens', deviceId));
  } catch {
    // No token existed for this device; safe to proceed with sign-out
  }
  try {
    const supported = await isFcmBrowserSupported().catch(() => false);
    if (supported) {
      await deleteToken(getMessaging(app));
    }
  } catch {
    // Ignore browser token deletion errors when no token was registered
  }
}

/**
 * Trusted Admin/Backend Order Event Emitter for end-to-end verification:
 * In Cloud Firestore, `/notifications` `create` is strictly locked to `isAdmin()`
 * (and Admin SDK Cloud Functions). Regular customers CANNOT forge notifications.
 */
export async function emitTrustedAdminOrderNotificationForTesting(params: {
  recipientUid: string;
  orderNumber: string;
  eventType: 'order_confirmed' | 'order_dispatched' | 'order_delivered';
}): Promise<MobileNotificationItem> {
  const now = new Date();
  const notifId = `notif_${now.getTime()}_${Math.floor(100 + Math.random() * 900)}`;

  const copyMap: Record<
    'order_confirmed' | 'order_dispatched' | 'order_delivered',
    { title: string; body: string }
  > = {
    order_confirmed: {
      title: `Order ${params.orderNumber} Confirmed`,
      body: `Trusted backend event: Order ${params.orderNumber} has been verified and queued for warehouse testing.`,
    },
    order_dispatched: {
      title: `Order ${params.orderNumber} Dispatched`,
      body: `Trusted backend event: Shipment ${params.orderNumber} has departed Califnco Logistics regional hub.`,
    },
    order_delivered: {
      title: `Order ${params.orderNumber} Delivered`,
      body: `Trusted backend event: Order ${params.orderNumber} was delivered. Book certified installation anytime on Screen 23.`,
    },
  };

  const copy = copyMap[params.eventType];
  const currentUser = auth.currentUser;

  if (isFirebaseConfigured && currentUser && currentUser.emailVerified) {
    await setDoc(doc(db, 'notifications', notifId), {
      recipientUid: params.recipientUid,
      title: copy.title,
      body: copy.body,
      eventType: params.eventType,
      orderId: 'ord-82941',
      orderNumber: params.orderNumber,
      source: 'trusted_admin_console_event',
      isRead: false,
      createdAtIso: now.toISOString(),
      createdByUid: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: notifId,
      recipientUid: params.recipientUid,
      title: copy.title,
      body: copy.body,
      eventType: params.eventType,
      orderId: 'ord-82941',
      orderNumber: params.orderNumber,
      source: 'trusted_admin_console_event',
      isRead: false,
      createdAtIso: now.toISOString(),
      persistedToFirestore: true,
    };
  }

  return {
    id: notifId,
    recipientUid: params.recipientUid,
    title: copy.title,
    body: copy.body,
    eventType: params.eventType,
    orderId: 'ord-82941',
    orderNumber: params.orderNumber,
    source: 'demo_preview',
    isRead: false,
    createdAtIso: now.toISOString(),
    persistedToFirestore: false,
  };
}

// ============================================================================
// SCREEN 26: DELIVERY LOCATION VALIDATION & OWNER-ISOLATED FIRESTORE SERVICE
// ============================================================================

export function validateDeliveryLocationForm(
  input: SaveDeliveryLocationInput
): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = input.recipientName.trim();
  if (name.length < 2 || name.length > 120) {
    errors.recipientName = 'Enter recipient full name (2–120 characters).';
  }

  const phone = input.phone.trim();
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 10 || digits.length > 15 || phone.length < 7 || phone.length > 24) {
    errors.phone = 'Enter a valid 10-digit mobile contact number.';
  }

  const street = input.streetAddress.trim();
  if (street.length < 5 || street.length > 240) {
    errors.streetAddress = 'Enter flat/building and street address (5–240 characters).';
  }

  if (input.landmark.trim().length > 140) {
    errors.landmark = 'Landmark must be 140 characters or fewer.';
  }

  const city = input.city.trim();
  if (city.length < 2 || city.length > 80) {
    errors.city = 'Enter a valid city or town.';
  }

  const state = input.state.trim();
  if (state.length < 2 || state.length > 80) {
    errors.state = 'Enter a valid state or province.';
  }

  const pin = input.postalCode.trim();
  if (pin.length < 4 || pin.length > 16 || !/^[0-9A-Za-z\- ]+$/.test(pin)) {
    errors.postalCode = 'Enter a valid postal / PIN code (e.g. 400050).';
  }

  if (input.deliveryInstructions.trim().length > 240) {
    errors.deliveryInstructions = 'Delivery instructions must be 240 characters or fewer.';
  }

  if (input.hasCoordinates) {
    if (
      Number.isNaN(input.latitude) ||
      input.latitude < -90 ||
      input.latitude > 90 ||
      Number.isNaN(input.longitude) ||
      input.longitude < -180 ||
      input.longitude > 180
    ) {
      errors.coordinates = 'Selected map coordinates are outside valid WGS84 bounds.';
    }
  }

  return errors;
}

export function subscribeUserDeliveryAddresses(
  userId: string,
  callbacks: {
    onAddresses: (items: SavedDeliveryLocationRecord[]) => void;
    onError?: (err: string) => void;
  }
): Unsubscribe {
  const path = `users/${userId}/delivery_addresses`;
  const q = query(
    collection(db, 'users', userId, 'delivery_addresses'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: SavedDeliveryLocationRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const rawLabel = String(d.label ?? 'Home');
        const label: 'Home' | 'Work' | 'Other' =
          rawLabel === 'Work' || rawLabel === 'Other' ? rawLabel : 'Home';
        const rawSource = String(d.locationSource ?? 'manual_only');
        const locationSource: LocationCaptureSource =
          rawSource === 'map_pin' || rawSource === 'gps_pin' ? rawSource : 'manual_only';

        return {
          addressId: String(d.addressId ?? docSnap.id),
          userId: String(d.userId ?? userId),
          label,
          recipientName: String(d.recipientName ?? ''),
          phone: String(d.phone ?? ''),
          streetAddress: String(d.streetAddress ?? ''),
          landmark: String(d.landmark ?? ''),
          city: String(d.city ?? ''),
          state: String(d.state ?? ''),
          postalCode: String(d.postalCode ?? ''),
          deliveryInstructions: String(d.deliveryInstructions ?? ''),
          isDefault: d.isDefault === true,
          hasCoordinates: d.hasCoordinates === true,
          latitude: Number(d.latitude ?? 0),
          longitude: Number(d.longitude ?? 0),
          locationSource,
          addressVerificationStatus:
            d.addressVerificationStatus === 'postal_verified_backend'
              ? 'postal_verified_backend'
              : 'unverified_manual_entry',
          createdAtIso: String(d.createdAtIso ?? new Date().toISOString()),
          persistedToFirestore: true,
        };
      });

      records.sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return b.createdAtIso.localeCompare(a.createdAtIso);
      });
      callbacks.onAddresses(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        callbacks.onError?.(formatted instanceof Error ? formatted.message : String(formatted));
      }
    }
  );
}

/**
 * Persists a Screen 26 Delivery Location address to `/users/{uid}/delivery_addresses/{addressId}`
 * when signed in, strictly recording `addressVerificationStatus: 'unverified_manual_entry'`.
 */
export async function saveUserDeliveryAddress(
  input: SaveDeliveryLocationInput
): Promise<SavedDeliveryLocationRecord> {
  const validationErrors = validateDeliveryLocationForm(input);
  const firstError = Object.values(validationErrors)[0];
  if (firstError) {
    throw new Error(firstError);
  }

  const now = new Date();
  const addressId = `addr_${now.getTime()}_${Math.floor(100 + Math.random() * 900)}`;
  const useCoordinates =
    input.hasCoordinates &&
    (input.locationSource === 'map_pin' || input.locationSource === 'gps_pin');

  const normalizedSource: LocationCaptureSource = useCoordinates
    ? input.locationSource
    : 'manual_only';
  const normalizedLat = useCoordinates ? Number(input.latitude.toFixed(6)) : 0;
  const normalizedLng = useCoordinates ? Number(input.longitude.toFixed(6)) : 0;
  const createdAtIso = now.toISOString();

  const currentUser = auth.currentUser;
  if (isFirebaseConfigured && currentUser && currentUser.emailVerified) {
    const colRef = collection(db, 'users', currentUser.uid, 'delivery_addresses');
    const path = `users/${currentUser.uid}/delivery_addresses/${addressId}`;

    try {
      const batch = writeBatch(db);
      if (input.isDefault) {
        const existingSnap = await getDocs(
          query(colRef, where('userId', '==', currentUser.uid))
        );
        existingSnap.docs.forEach((docSnap) => {
          if (docSnap.data().isDefault === true) {
            batch.update(docSnap.ref, {
              isDefault: false,
              updatedAt: serverTimestamp(),
            });
          }
        });
      }

      batch.set(doc(colRef, addressId), {
        addressId,
        userId: currentUser.uid,
        label: input.label,
        recipientName: input.recipientName.trim().slice(0, 120),
        phone: input.phone.trim().slice(0, 24),
        streetAddress: input.streetAddress.trim().slice(0, 240),
        landmark: input.landmark.trim().slice(0, 140),
        city: input.city.trim().slice(0, 80),
        state: input.state.trim().slice(0, 80),
        postalCode: input.postalCode.trim().slice(0, 16),
        deliveryInstructions: input.deliveryInstructions.trim().slice(0, 240),
        isDefault: input.isDefault,
        hasCoordinates: useCoordinates,
        latitude: normalizedLat,
        longitude: normalizedLng,
        locationSource: normalizedSource,
        addressVerificationStatus: 'unverified_manual_entry',
        createdAtIso,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      return {
        addressId,
        userId: currentUser.uid,
        label: input.label,
        recipientName: input.recipientName.trim().slice(0, 120),
        phone: input.phone.trim().slice(0, 24),
        streetAddress: input.streetAddress.trim().slice(0, 240),
        landmark: input.landmark.trim().slice(0, 140),
        city: input.city.trim().slice(0, 80),
        state: input.state.trim().slice(0, 80),
        postalCode: input.postalCode.trim().slice(0, 16),
        deliveryInstructions: input.deliveryInstructions.trim().slice(0, 240),
        isDefault: input.isDefault,
        hasCoordinates: useCoordinates,
        latitude: normalizedLat,
        longitude: normalizedLng,
        locationSource: normalizedSource,
        addressVerificationStatus: 'unverified_manual_entry',
        createdAtIso,
        persistedToFirestore: true,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  return {
    addressId,
    userId: 'user_sarah',
    label: input.label,
    recipientName: input.recipientName.trim().slice(0, 120),
    phone: input.phone.trim().slice(0, 24),
    streetAddress: input.streetAddress.trim().slice(0, 240),
    landmark: input.landmark.trim().slice(0, 140),
    city: input.city.trim().slice(0, 80),
    state: input.state.trim().slice(0, 80),
    postalCode: input.postalCode.trim().slice(0, 16),
    deliveryInstructions: input.deliveryInstructions.trim().slice(0, 240),
    isDefault: input.isDefault,
    hasCoordinates: useCoordinates,
    latitude: normalizedLat,
    longitude: normalizedLng,
    locationSource: normalizedSource,
    addressVerificationStatus: 'unverified_manual_entry',
    createdAtIso,
    persistedToFirestore: false,
  };
}
