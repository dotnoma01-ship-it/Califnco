# Califnco Mobile & Admin Platform — Zero-Trust Firestore Security Specification

## 1. Data Invariants & Relationship Mapping (Master Source of Truth)

1. **Administrator Privilege Invariant**:
   - Client-supplied role flags, UI state, or unverified JWT claims are never trusted.
   - Administrative privilege requires `request.auth != null`, `request.auth.token.email_verified == true`, and either the bootstrapped runtime administrator email (`carternoah060@gmail.com`) or an explicit document in `/admins/{uid}` created by an existing administrator.
   - Users cannot self-create or self-elevate records in `/admins/{adminId}`.

2. **PII Split-Collection Isolation Invariant**:
   - `/orders/{orderId}`, `/dealers/{dealerId}`, and `/service_requests/{requestId}` store operational and compliance summary metadata only. Street addresses, personal/direct phone numbers, and contact emails are isolated inside dedicated single-document subcollections:
     - `/orders/{orderId}/private_details/shipping`
     - `/dealers/{dealerId}/application_details/review`
     - `/service_requests/{requestId}/private_details/contact`
   - Bulk `list` queries on `/admins`, `/service_schedules`, and all PII subcollections (`private_details`, `application_details`) are unconditionally denied (`allow list: if false;`).

3. **Dealer Anti-Self-Approval & Mobile Approval Gate Invariant (Page 21)**:
   - Non-administrator applicants creating `/dealers/{dealerId}` MUST bind `dealerId == request.auth.uid`, `ownerUid == request.auth.uid`, `approvalStatus == 'pending'`, `rejectionReason == ''`, `creditLimit == 0`, `availableCredit == 0`, and atomically create `/dealers/{dealerId}/application_details/review`. Self-approval (`approvalStatus == 'approved'`) on registration is strictly rejected.
   - Non-administrators have zero `update` privileges on `/dealers/{dealerId}` — applicants can never approve themselves or alter credit limits.
   - Only `isAdmin()` can transition a `'pending'` dealer application to `'approved'` (setting `reviewedByUid == request.auth.uid`, `reviewedAt == request.time`, `updatedAt == request.time`, `rejectionReason == ''`, and positive `creditLimit`) or `'rejected'` (requiring `rejectionReason.size() >= 5`, `creditLimit == 0`, `reviewedByUid == request.auth.uid`, `reviewedAt == request.time`, and `updatedAt == request.time`).
   - Mobile Wholesale Gate: Creating a wholesale order (`channel == 'dealer'`) in `/orders/{orderId}` by a non-admin requires `get(/databases/$(database)/documents/dealers/$(request.auth.uid)).data.approvalStatus == 'approved'`.

4. **Service Desk Lifecycle & Resolution Notes Invariant (Page 22)**:
   - Supports water purifier `Installation`, `Maintenance`, and `Repair` service requests.
   - Only `isAdmin()` can update `/service_requests/{requestId}` status (`open` -> `scheduled` / `in_progress` / `cancelled`; `scheduled` -> `in_progress` / `completed` / `cancelled`; `in_progress` -> `completed` / `cancelled`), `scheduledDateIso`, and `resolutionNotes`.
   - Terminal states `'completed'` and `'cancelled'` lock further mutations and require documented `resolutionNotes` (`size() >= 5 && size() <= 600`) plus `updatedByUid == request.auth.uid` and `updatedAt == request.time`.

5. **Mobile Service Booking & Scheduling Integrity Invariant (Screens 23 & 24)**:
   - Verified customers creating `/service_requests/{requestId}` MUST set `customerUid == request.auth.uid`, `createdByUid == request.auth.uid`, `status == 'open'`, `resolutionNotes == ''`, `createdAt == request.time`, `updatedAt == request.time`, and atomically create `/service_requests/{requestId}/private_details/contact` (`existsAfter(...)`).
   - Customers CANNOT self-confirm appointments (`status: 'scheduled'`) on creation; submitted requests always enter `'open'` until dispatch confirms availability.
   - Standalone service requests (`orderId == 'DIRECT-SERVICE'`) are allowed without requiring an online order record; if a specific `orderId` is referenced, `existsAfter` and `customerUid == request.auth.uid` prevent cross-customer order linking.
    - `/service_schedules/{scheduleId}` permits verified single-document `get` lookups (`allow list: if false`) to supply real configured time slots on Screen 23 while restricting all writes to `isAdmin()`.

6. **Trusted Backend Notifications & Secure FCM Token Isolation Invariant (Screen 25)**:
   - Clients CANNOT fabricate or self-inject order notifications: `create` on `/notifications/{notificationId}` is restricted strictly to trusted backend Cloud Functions (Admin SDK) or verified `isAdmin()` lifecycle operations (`isRead == false` on creation).
   - Verified recipients (`existing().recipientUid == request.auth.uid`) can ONLY read their own notifications (`resource.data.recipientUid == request.auth.uid` on `list`, 0 DB reads) and perform a one-way `markAsRead` update (`isRead: false -> true`, `readAt == request.time`, `updatedAt == request.time`) with all message/order fields strictly immutable.
   - Device push registration tokens in `/users/{userId}/fcm_tokens/{deviceId}` enforce `request.auth.uid == userId`, `allow list: if false` (zero token scraping), granted/provisional permission status, and explicit `delete` support so tokens are revoked immediately on `signOut`.

7. **Delivery Location PII Isolation & Unverified Map Coordinate Invariant (Screen 26)**:
   - Delivery addresses in `/users/{userId}/delivery_addresses/{addressId}` contain street/phone/coordinate PII and are strictly isolated to `request.auth.uid == userId` (`resource.data.userId == request.auth.uid` on `list` with 0 DB reads).
   - Selecting an OpenStreetMap or GPS coordinate NEVER produces a verified postal address: client `create` and `update` operations MUST set `addressVerificationStatus == 'unverified_manual_entry'` and supply valid manual postal fields (`streetAddress`, `city`, `state`, `postalCode`), or save with `hasCoordinates == false` (`locationSource == 'manual_only'`). Clients attempting to forge `addressVerificationStatus: 'postal_verified_backend'` are rejected with `PERMISSION_DENIED`.

---

## 2. The "Dirty Dozen" (+ Mobile Screens 23–26) Adversarial Payloads

| # | Attack Vector | Target Path & Op | Malicious Payload Summary | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Self-Assigned Admin Escalation** | `CREATE /admins/attacker_uid` | Non-admin user writes `{ uid: "attacker_uid", ... }` | `PERMISSION_DENIED` |
| 2 | **Unverified Email Admin Spoof** | `GET /orders/ord_1001` | Token has `email: "carternoah060@gmail.com"` with `email_verified: false` | `PERMISSION_DENIED` |
| 3 | **Shadow / Ghost Field Injection** | `UPDATE /orders/ord_1001` | Admin sends valid `confirmed` transition plus `{ isVerifiedOverride: true }` | `PERMISSION_DENIED` |
| 4 | **Order State Shortcutting** | `UPDATE /orders/ord_1001` | Admin attempts jump from `fulfilmentStatus: "pending"` directly to `"delivered"` | `PERMISSION_DENIED` |
| 5 | **Terminal Order Mutation** | `UPDATE /orders/ord_delivered` | Admin attempts to revert a `"delivered"` order back to `"processing"` | `PERMISSION_DENIED` |
| 6 | **Dealer Self-Approval on Create** | `CREATE /dealers/dealer_attacker` | Applicant submits new dealer profile with `approvalStatus: "approved"` or `creditLimit: 500000` | `PERMISSION_DENIED` |
| 7 | **Dealer Self-Approval on Update** | `UPDATE /dealers/dealer_pending` | Pending dealer owner attempts `update` setting `approvalStatus: "approved"` | `PERMISSION_DENIED` |
| 8 | **Admin Rejection Without Reason** | `UPDATE /dealers/dealer_pending` | Admin rejects dealer with empty `rejectionReason: ""` or forged `reviewedAt` | `PERMISSION_DENIED` |
| 9 | **Unapproved Dealer Wholesale Order** | `CREATE /orders/po_unapproved` | Pending/rejected dealer attempts to create `channel: "dealer"` wholesale order | `PERMISSION_DENIED` |
| 10 | **Cross-Tenant PII Theft & List Scrape** | `GET/LIST .../private_details` & `application_details` | Non-owner user attempts `get` or any user attempts `list` on isolated PII subcollections | `PERMISSION_DENIED` |
| 11 | **Service Ticket Close Without Notes** | `UPDATE /service_requests/srv_401` | Admin marks ticket `completed` with empty `resolutionNotes: ""` or skips `open -> completed` | `PERMISSION_DENIED` |
| 12 | **Terminal Service Ticket Mutation** | `UPDATE /service_requests/srv_done` | Admin attempts to reopen or alter a `completed` or `cancelled` service request | `PERMISSION_DENIED` |
| 13 | **Customer Spoofed Confirmed Appointment** | `CREATE /service_requests/srv_spoof` | Customer submits Screen 23 booking with `status: "scheduled"` or `customerUid` of another user | `PERMISSION_DENIED` |
| 14 | **Unauthorized Schedule Slot Injection** | `CREATE /service_schedules/2026-10-29_400050` | Non-admin user attempts to publish or overwrite technician scheduling slots | `PERMISSION_DENIED` |
| 15 | **Client Forged Order Notification** | `CREATE /notifications/notif_fake` | Non-admin user attempts to fabricate an `"order_dispatched"` notification | `PERMISSION_DENIED` |
| 16 | **Notification Body Tampering on Mark-Read** | `UPDATE /notifications/notif_1` | Recipient marks `isRead: true` while also altering `title` or `orderNumber` | `PERMISSION_DENIED` |
| 17 | **Cross-User FCM Token Theft / List Scrape** | `GET/LIST /users/other_uid/fcm_tokens` | Authenticated user attempts to read or list another user's FCM push tokens | `PERMISSION_DENIED` |
| 18 | **Forged Verified Postal Address from Map Pin** | `CREATE /users/uid/delivery_addresses/addr_1` | Client drops map pin and sets `addressVerificationStatus: "postal_verified_backend"` or out-of-range coordinates | `PERMISSION_DENIED` |

---

## 3. Red Team Audit & Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource / Value Poisoning | Query / PII Leak Check | Audit Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/admins/{adminId}` | Blocked: `isAdmin()` required; `uid == adminId` & `grantedByUid == request.auth.uid`. | Immutable (`allow update: if false`). | `isValidId` + strict `hasOnly` + `.size()` bounds. | `allow list: if false`; `get` restricted to `isAdmin()` or self UID. | **PASS** |
| `/orders/{orderId}` | `createdByUid == request.auth.uid`; wholesale orders verify `dealers/$(uid).approvalStatus == 'approved'`. | Step-by-step fulfilment + terminal lock on `delivered` / `cancelled`. | `isValidOrderSummary(incoming())` wraps `create` and `update`. | Zero PII; `list` uses 0 DB reads. | **PASS** |
| `/orders/{orderId}/items/{itemId}` | `getAfter` Master Gate verifies parent order & `customerUid`. | Immutable (`allow update, delete: if false`). | `isValidOrderLineItem(incoming())` enforces bounds. | `list` checks `isBootstrappedAdmin()` or `resource.data.customerUid == request.auth.uid`. | **PASS** |
| `/orders/{orderId}/private_details/{detailId}` | Locked to `detailId == 'shipping'`; Master Gate checks parent order. | Updates restricted to `dispatchNotes` + `updatedAt` by `isAdmin()`. | `isValidOrderPrivateDetails(incoming())` wraps writes. | `allow list: if false`; `get` restricted to `isAdmin()` or parent owner. | **PASS** |
| `/dealers/{dealerId}` | Non-admin forced to `dealerId == uid`, `ownerUid == uid`, `approvalStatus == 'pending'`; zero non-admin updates. | `pending` -> `approved` or `rejected` (requires reason >= 5 chars); decided states locked; server `reviewedAt` enforced. | `isValidDealerSummary(incoming())` wraps `create` and `update` with strict key & size bounds. | Contact PII split into `application_details/review`; `list` uses 0 DB reads. | **PASS** |
| `/dealers/{dealerId}/application_details/{detailId}` | Locked to `detailId == 'review'`; Master Gate verifies parent dealer `ownerUid` or `isAdmin()`. | Read-only after submission (`allow update: if false`). | `isValidDealerApplicationReviewDetails(incoming())` enforces email/phone/warehouse bounds. | `allow list: if false`; `get` restricted strictly to `isAdmin()` or parent `ownerUid`. | **PASS** |
| `/service_requests/{requestId}` | Customer `create` enforces `customerUid == uid`, `createdByUid == uid`, `status == 'open'`, and atomic `private_details/contact`. | Validated lifecycle (`open` -> `scheduled`/`in_progress` -> `completed`), terminal lock, non-empty `resolutionNotes` on close. | `isValidServiceRequest(incoming())` wraps `create` and `update` with `.size()` limits on all fields. | Site contact PII split into `private_details/contact`; `list` uses 0 DB reads. | **PASS** |
| `/service_requests/{requestId}/private_details/{detailId}` | Locked to `detailId == 'contact'`; Master Gate verifies parent `customerUid` or `isAdmin()`. | Immutable contact snapshot (`allow update, delete: if false`). | `isValidServiceRequestPrivateContact(incoming())` enforces address/phone/TDS bounds. | `allow list: if false`; `get` restricted to `isAdmin()` or parent `customerUid`. | **PASS** |
| `/service_schedules/{scheduleId}` | Writes restricted strictly to `isAdmin()` with `updatedByUid == request.auth.uid`. | `updatedAt == request.time` enforced on create/update. | `isValidServiceScheduleConfig(incoming())` enforces `availableSlots.size() <= 8` & string length bounds. | `allow list: if false`; single-doc `get` contains zero user PII. | **PASS** |
| `/notifications/{notificationId}` | `create` restricted strictly to `isAdmin()` (or Admin SDK Cloud Functions); non-admins blocked from forging notifications. | Recipient `update` restricted to one-way `isRead: false -> true` + `readAt == request.time`; already-read records locked. | `isValidUserNotification(incoming())` wraps `create` and `update` with strict key/enum/size bounds. | `list` checks `isBootstrappedAdmin()` or `resource.data.recipientUid == request.auth.uid` (0 DB reads). | **PASS** |
| `/users/{userId}/fcm_tokens/{deviceId}` | Enforces `request.auth.uid == userId`, `incoming().userId == userId`, and `incoming().deviceId == deviceId`. | Only `authorized` or `provisional` tokens accepted; `delete` allowed for owner sign-out cleanup. | `isValidDevicePushToken(incoming())` wraps `create` and `update` with `fcmToken.size() <= 4096`. | `allow list: if false`; `get` restricted strictly to owner `request.auth.uid == userId`. | **PASS** |
| `/users/{userId}/delivery_addresses/{addressId}` | Enforces `request.auth.uid == userId`, `incoming().userId == userId`, and `incoming().addressId == addressId`. | Client writes locked to `addressVerificationStatus == 'unverified_manual_entry'`; coordinate range & source consistency enforced. | `isValidUserDeliveryAddress(incoming())` wraps `create` and `update` with lat/lng & string bounds. | `list` checks `request.auth.uid == userId && resource.data.userId == request.auth.uid` (0 DB reads). | **PASS** |
