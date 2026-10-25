# Califnco Admin Web Application — Zero-Trust Firestore Security Specification

## 1. Data Invariants & Relationship Mapping (Master Source of Truth)

1. **Administrator Privilege Invariant**:
   - Client-supplied role flags, UI state, or unverified JWT claims are never trusted.
   - Administrative privilege requires `request.auth != null`, `request.auth.token.email_verified == true`, and either the bootstrapped runtime administrator email (`carternoah060@gmail.com`) or an explicit document in `/admins/{uid}` created by an existing administrator.
   - Users cannot self-create or self-elevate records in `/admins/{adminId}`.

2. **PII Split-Collection Isolation Invariant**:
   - `/orders/{orderId}` contains operational summary metadata only (`orderNumber`, `channel`, `partyId`, `partyDisplayName`, `regionCity`, monetary totals, and statuses). Zero street addresses, phone numbers, personal emails, or tax IDs are stored on summary documents.
   - Sensitive recipient PII (`recipientName`, `email`, `phone`, `shippingAddress`, `postalCode`, `gstin`) is isolated inside `/orders/{orderId}/private_details/shipping`.
   - Bulk `list` queries on `/orders/{orderId}/private_details` and `/admins` are unconditionally denied (`allow list: if false;`) to prevent bulk PII or admin directory scraping.

3. **Master Gate & Atomic Creation Invariant**:
   - Creating `/orders/{orderId}` requires `existsAfter(/databases/$(database)/documents/orders/$(orderId)/private_details/shipping)` in the same atomic batch.
   - Subcollections `/orders/{orderId}/items/{itemId}` and `/orders/{orderId}/private_details/{detailId}` verify parent existence and ownership parity (`getAfter` / `get` on `/orders/$(orderId)`) so orphaned line items or mismatched `customerUid` records can never exist.

4. **Deterministic Order Lifecycle & Terminal State Locking**:
   - Allowed fulfilment forward steps:
     - `pending` -> `confirmed`
     - `confirmed` -> `processing`
     - `processing` -> `dispatched`
     - `dispatched` -> `delivered`
   - Pre-dispatch cancellation:
     - Allowed only from `pending`, `confirmed`, or `processing` -> `cancelled` (if `paymentStatus == 'paid'`, `paymentStatus` must simultaneously transition to `'refunded'`).
   - Terminal states:
     - Once `fulfilmentStatus` reaches `'delivered'` or `'cancelled'`, all subsequent updates to `/orders/{orderId}` are rejected.
   - Temporal & Identity Immutability:
     - `createdAt == request.time` on creation, `updatedAt == request.time` on update, and `createdByUid`, `customerUid`, `orderNumber`, `totalAmount`, and `createdAt` are immutable across updates.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path & Op | Malicious Payload Summary | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Self-Assigned Admin Escalation** | `CREATE /admins/attacker_uid` | Non-admin user writes `{ uid: "attacker_uid", email: "evil@corp.com", displayName: "Attacker", grantedByUid: "attacker_uid", createdAt: SERVER_TIME }` | `PERMISSION_DENIED` |
| 2 | **Unverified Email Admin Spoof** | `GET /orders/ord_1001` | Token has `email: "carternoah060@gmail.com"` with `email_verified: false` | `PERMISSION_DENIED` |
| 3 | **Shadow / Ghost Field Injection** | `UPDATE /orders/ord_1001` | Admin sends valid `confirmed` transition plus `{ isVerifiedOverride: true }` | `PERMISSION_DENIED` |
| 4 | **State Shortcutting (Skip Steps)** | `UPDATE /orders/ord_1001` | Admin attempts jump from `fulfilmentStatus: "pending"` directly to `"delivered"` | `PERMISSION_DENIED` |
| 5 | **Terminal State Mutation** | `UPDATE /orders/ord_delivered` | Admin attempts to revert a `"delivered"` order back to `"processing"` | `PERMISSION_DENIED` |
| 6 | **Dispatched Order Illegal Cancel** | `UPDATE /orders/ord_dispatched` | Admin attempts to set `fulfilmentStatus: "cancelled"` after freight dispatch | `PERMISSION_DENIED` |
| 7 | **Cross-Tenant PII Theft** | `GET /orders/ord_1001/private_details/shipping` | Authenticated non-owner customer attempts `get` on another customer's shipping address | `PERMISSION_DENIED` |
| 8 | **Bulk PII List Scraping** | `LIST /orders/ord_1001/private_details` | Any client attempts collection `list` on `private_details` | `PERMISSION_DENIED` |
| 9 | **Denial-of-Wallet Oversized ID / String** | `CREATE /orders/AAAA...[200 chars]` | Payload injects 200-char doc ID or 5,000-char `partyDisplayName` | `PERMISSION_DENIED` |
| 10 | **Value Poisoning on Allowed Key** | `UPDATE /orders/ord_1001` | Updates whitelisted key `fulfilmentStatus` to integer `999` or `"hacked_state"` | `PERMISSION_DENIED` |
| 11 | **Orphaned Order Summary (Missing Atomic PII)** | `CREATE /orders/ord_orphan` | Creates `/orders/ord_orphan` alone without `/orders/ord_orphan/private_details/shipping` | `PERMISSION_DENIED` |
| 12 | **Forged Client Timestamp / Immutable Tamper** | `UPDATE /orders/ord_1001` | Admin modifies `totalAmount: 1` or supplies past `updatedAt` != `request.time` | `PERMISSION_DENIED` |

---

## 3. Red Team Audit & Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource / Value Poisoning | Query / PII Leak Check | Audit Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/admins/{adminId}` | Blocked: `isAdmin()` required to grant; `uid == adminId` & `grantedByUid == request.auth.uid` enforced. | Immutable (`allow update: if false`). | `isValidId(adminId)` + strict `hasOnly` + string `.size()` bounds. | `allow list: if false`; `get` restricted to `isAdmin()` or self UID. | **PASS** |
| `/orders/{orderId}` | `createdByUid == request.auth.uid`; immutable `customerUid`, `orderNumber`, `createdAt`. | Strict step-by-step state machine + terminal lock on `delivered` / `cancelled`. | `isValidOrder(incoming())` wraps `create` and `update`; numeric & string bounds enforced. | Zero PII stored; `list` requires `isBootstrappedAdmin()` or `resource.data.customerUid == request.auth.uid` (0 `get()`/`exists()` calls). | **PASS** |
| `/orders/{orderId}/items/{itemId}` | `getAfter` Master Gate verifies parent order exists and `customerUid` matches parent. | Immutable line items (`allow update, delete: if false`). | `isValidOrderLineItem(incoming())` enforces SKU regex, category enum, and positive bounds. | `list` checks `isBootstrappedAdmin()` or `resource.data.customerUid == request.auth.uid` (0 DB lookups). | **PASS** |
| `/orders/{orderId}/private_details/{detailId}` | Locked to `detailId == 'shipping'`; Master Gate checks parent order ownership/admin. | Updates restricted to `dispatchNotes` + `updatedAt` by `isAdmin()` before terminal parent state. | `isValidOrderPrivateDetails(incoming())` enforces address, email, phone, postal regex/bounds. | `allow list: if false`; `get` restricted strictly to `isAdmin()` or parent order `customerUid`. | **PASS** |
| `/dealers/{dealerId}` | `createdByUid == request.auth.uid`; `ownerUid` immutable. | Action-based update allows only `approvalStatus`, `wholesaleTier`, `updatedAt` by `isAdmin()`. | `isValidDealerSummary(incoming())` wraps all writes with regex & size bounds. | `list` restricted to `isBootstrappedAdmin()` or `resource.data.ownerUid == request.auth.uid`. | **PASS** |
| `/service_requests/{requestId}` | `createdByUid == request.auth.uid`; Master Gate checks `exists(/orders/$(incoming().orderId))`. | Terminal lock on `completed` / `cancelled`; `affectedKeys().hasOnly(['status', 'scheduledDateIso', 'updatedAt'])`. | `isValidServiceRequest(incoming())` wraps `create` and `update`. | `list` restricted to `isBootstrappedAdmin()` or `resource.data.customerUid == request.auth.uid`. | **PASS** |
