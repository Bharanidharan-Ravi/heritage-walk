# Cashfree Payment → Booking Confirmation — Plan

Status (2026-10-06): **steps 1–7 done**: Pay Now, confirmation page, webhook, expiry worker, retry,
rate limiting. Remaining setup and the phase 2 backlog are in [GO_LIVE.md](GO_LIVE.md).
The "Step 1, built" notes below are kept for history.

Decisions made:
- `ExperienceTemplate.Price` is the **final** per-person price. Platform and gateway fees are
  already included (via the Admin price calculator), so checkout adds nothing on top.
- Private bookings use the new `ExperienceTemplate.PrivatePrice` (per person, falls back to `Price`).
- A pending booking holds its seats or date for **15 minutes** in production (`Bookings:HoldMinutes`;
  2 minutes locally via the gitignored `appsettings.Development.json`). The Cashfree order itself
  always gets at least 16 minutes, Cashfree's minimum; the expiry worker terminates it once the hold ends.

Step 1, built:
- `POST /api/bookings` → `BookingService.CreatePendingAsync` → `CashfreePaymentGateway.CreateOrderAsync`.
  Returns `{ bookingRef, paymentSessionId, mode, amount, unitPrice, quantity, currency, expiresAt }`.
- `GET /api/bookings/{ref}` returns the status plus Cashfree's live order status (read-only for now).
- Migration `AddCashfreeBookings`: booking columns on `FormSubmissions` (Razorpay columns renamed to
  `GatewayOrderId`/`GatewayPaymentId`), and `ExperienceTemplates.PrivatePrice`.
- `BookingRules` (Application) now holds the slot and required-field checks shared with `FormsController`.

Next: step 2 (confirm on PAID: status → Paid, capacity − Quantity, emails), step 3 (UI: Pay Now →
Cashfree checkout → `/booking/:ref` page), step 4 (webhook), step 5 (admin Private price field).
This replaces the Razorpay payment parts of [MASTER_PROMPT.md](MASTER_PROMPT.md).
Every other part of that spec (form templates, fields, emails, Azure SQL) still applies.

Goal: the visitor clicks **Pay Now** on the registration screen, pays through Cashfree, and
lands on a **Booking Confirmed** page with a booking ID (e.g. `AT-7K3Q9M`). Later, the same
"booking confirmed" moment also sends the email and the WhatsApp group link.

---

## 1. What exists today (and what has to change)

| Area | Today | Problem |
|---|---|---|
| `IPaymentService` | `CreateOrderAsync` + `VerifySignature(orderId, paymentId, signature)` | The signature check is Razorpay-style. Cashfree confirms a payment by **fetching the order status** from its API (plus a signed webhook). |
| `RazorpayPaymentService` | Stub | To be replaced by `CashfreePaymentService`. |
| `FormSubmission` | `RazorpayOrderId`, `RazorpayPaymentId`, row saved **only after** payment | No row exists before payment, so a redirect back from Cashfree has nothing to look up, and there's no booking ID to show. |
| `POST /api/forms/{slug}/order` | Amount = `template.Price` | Ignores **quantity** (Group, 4 people = 4 × price) and the Private min-people rule. |
| `FormPage.jsx` | Loads the Razorpay Checkout script | Switch to the Cashfree JS SDK. |
| `PaymentSettings` / `PricingService` | Already Cashfree-shaped (Sandbox/Production, fee %s) | Reuse it: `Environment` picks the Cashfree base URL. |
| `SubmissionStatus` | `PendingPayment / Paid / Failed / Submitted` | Good as is. Add `Expired` (see §6). |

**Key design change:** create the booking row *before* the payment (status `PendingPayment`),
use its booking ID as Cashfree's `order_id`, then flip it to `Paid` once Cashfree confirms.

---

## 2. End-to-end flow

```
Visitor                    React (UI)                    .NET API                         Cashfree
───────                    ──────────                    ────────                         ────────
fills form, clicks
"Pay Now"  ───────────▶  POST /api/bookings  ─────────▶  validate fields, slot, capacity
                         {slug, formData, qty,           amount = server-side price × qty
                          registrationType, slot}        save FormSubmission
                                                           (PendingPayment, BookingRef)
                                                         POST /pg/orders  ─────────────▶  creates order
                                                         ◀──────── payment_session_id ───
                         ◀── {bookingRef,
                              paymentSessionId, mode}
                         cashfree.checkout(...)  ─────────────────────────────────────▶  Cashfree payment page
pays (UPI/card/…)                                                                         (theirs, PCI-safe)
                                                         ◀── webhook PAYMENT_SUCCESS ────  (server-to-server)
                                                         verify webhook signature
                                                         ConfirmBookingAsync(ref)
                         ◀──────────── redirect to return_url: /booking/AT-7K3Q9M ──────
                         GET /api/bookings/AT-7K3Q9M ─▶  if still Pending: GET /pg/orders/{id}
                                                         → PAID? ConfirmBookingAsync(ref)
                         ◀── {status: "Paid", ...}
shows "Booking
Confirmed ✓ AT-7K3Q9M"
```

A booking is confirmed by **whichever arrives first**: the webhook, or the confirmation page
asking the API. Both go through one idempotent `ConfirmBookingAsync` (§5), so emails fire once.

**Never** mark a booking paid because the browser came back to `return_url`. That URL can be
opened by anyone. Only the Cashfree API response or a signature-verified webhook counts.

---

## 3. "Custom payment page": which Cashfree option

Cashfree's JS SDK (`@cashfreepayments/cashfree-js`) offers three ways in:

| Option | What the visitor sees | Effort | Recommendation |
|---|---|---|---|
| **Redirect checkout** (`redirectTarget: "_self"`) | Leaves our site for Cashfree's hosted page, then returns to `/booking/:ref` | Lowest | **Start here** |
| **Popup/modal checkout** (`redirectTarget: "_modal"`) | Cashfree's page opens in an overlay on our registration screen | Low | Good upgrade, same backend |
| **Cashfree Elements** (card / UPI components mounted in our own layout) | Fully our own design, Cashfree renders only the input fields in secure iframes | High | Later, if the hosted page isn't on-brand enough |

The page *around* the payment is ours in every option: the registration screen with the booking
card (summary, total, Pay Now), and the `/booking/:ref` confirmation page. Cashfree's hosted page
also shows our logo, name and colours, which are set in the Cashfree merchant dashboard.

The backend is **identical for all three options**. Only the one `checkout()` call changes. So
build with the redirect first and switch later with no API work.

---

## 4. Data model changes (EF Core migration)

### `FormSubmission`, renamed to be gateway-neutral and booking-aware

```csharp
public string BookingRef { get; set; }          // "AT-7K3Q9M" — unique index, shown to users
public string? PaymentGateway { get; set; }     // "Cashfree"
public string GatewayOrderId { get; set; }      // was RazorpayOrderId  (= BookingRef for Cashfree)
public string? GatewayPaymentId { get; set; }   // was RazorpayPaymentId (cf_payment_id)
public string? GatewaySessionId { get; set; }   // payment_session_id, for "retry payment"
public int Quantity { get; set; } = 1;
public string? RegistrationType { get; set; }   // "Group" | "Private"
public string? SubmitterPhone { get; set; }     // Cashfree REQUIRES customer_phone
public Guid? ExperienceTemplateId { get; set; } // direct link, for WhatsApp group lookup later
public DateTime? PaidAt { get; set; }
public DateTime? ExpiresAt { get; set; }        // pending hold ends (e.g. CreatedAt + 20 min)
```

`BookingRef` format: `AT-` + 6 chars from an unambiguous alphabet (no 0/O/1/I). Generate it,
retry on a unique-index collision. Use it as Cashfree's `order_id` too (their rule: 3–45 chars,
alphanumeric, `-` and `_` allowed), so a webhook maps straight to the row.

### New `PaymentWebhookEvents` table (audit + dedupe)

`Id, Gateway, EventType, GatewayOrderId, RawBody, SignatureValid, ReceivedAt, ProcessedAt`.
Every webhook is logged raw before processing. This is invaluable when a customer says "I paid
but got nothing".

### Later (email/WhatsApp phase): `BookingNotifications`

`Id, SubmissionId, Channel (Email|WhatsApp), Recipient, Status, Attempts, LastError, SentAt`.
It records what was sent, so a failed send can be retried and nothing is sent twice.

### `ExperienceTemplate` (later)

`public string? WhatsAppGroupLink { get; set; }`, set by an Admin in the Experience Builder, and
shown only on the confirmation page and in the confirmation email (never on the public page).

---

## 5. Backend: API contract (Clean Architecture, Contact-feature pattern)

**Domain**: the entity changes above.
**Application**:
- `Interfaces/IPaymentGateway.cs` (replaces `IPaymentService`):
  ```csharp
  Task<GatewayOrder> CreateOrderAsync(GatewayOrderRequest req);   // → payment_session_id
  Task<GatewayOrderStatus> GetOrderStatusAsync(string orderId);  // PAID | ACTIVE | EXPIRED …
  bool VerifyWebhookSignature(string rawBody, string timestamp, string signature);
  ```
- `Interfaces/IBookingService.cs`: `CreatePendingAsync`, `ConfirmAsync(bookingRef)`, `GetPublicAsync(bookingRef)`.
- `Features/Bookings/`: `CreateBookingRequest`, `CreateBookingResponse`, `BookingStatusDto`.
- `Interfaces/IBookingConfirmedHandler.cs`: the hook point for email/WhatsApp (see §8).

**Infrastructure**: `Services/CashfreePaymentGateway.cs` (plain `HttpClient`, no SDK needed),
`Services/BookingService.cs`.

**Api**: `Controllers/BookingsController.cs`, `Controllers/PaymentWebhooksController.cs`.

### Endpoints

| Method + route | Who | Does |
|---|---|---|
| `POST /api/bookings` | public | Body `{ slug, formData, submitterName, submitterEmail, submitterPhone, quantity, registrationType, slot }`. Validates required fields, slot, capacity and booking-closed date. **Computes the amount server-side.** Saves a `PendingPayment` row, creates the Cashfree order and returns `{ bookingRef, paymentSessionId, environment }`. On a free form it saves the row as `Submitted`, confirms immediately and returns `{ bookingRef, paymentSessionId: null }`. |
| `GET /api/bookings/{ref}` | public | Returns **limited** fields only: `{ bookingRef, status, experienceTitle, date, quantity, amountPaid, currency, submitterFirstName, whatsAppGroupLink (only when Paid) }`. If the status is still `PendingPayment`, it first asks Cashfree (`GetOrderStatusAsync`) and confirms when the order is `PAID`. |
| `POST /api/bookings/{ref}/retry` | public | Pending and not expired: returns the stored or a fresh `paymentSessionId`, for the "Payment failed, try again" button. |
| `POST /api/payments/cashfree/webhook` | Cashfree | Reads the **raw body**, verifies `x-webhook-signature` (Base64 HMAC-SHA256 of `x-webhook-timestamp + rawBody` using the secret key), logs to `PaymentWebhookEvents`, and calls `ConfirmAsync` on `PAYMENT_SUCCESS_WEBHOOK` or marks the booking failed. Always returns 200 quickly. |

The old `POST /api/forms/{slug}/order` and `/submit` stay for now (for standalone forms) and are
migrated onto the same booking service afterwards.

### Amount: always server-side

```
unit     = ExperienceTemplate.Price (or FormTemplate.Price for a standalone form)
quantity = Group   → qty from the cart (1..CapacityRemaining)
           Private → max(qty, PrivateMinPeople)
amount   = unit × quantity          ← what Cashfree is asked to collect
```

The client sends only `quantity` and `registrationType`, **never an amount**. Whether platform or
gateway fees are added on top or already included in `Price` is decided by `PaymentSettings` +
`PricingService`. **Open question for you (§10).**

### `ConfirmAsync(bookingRef)`: the single, idempotent confirm

```sql
UPDATE FormSubmissions
SET Status = Paid, PaidAt = now, GatewayPaymentId = @pid
WHERE BookingRef = @ref AND Status = PendingPayment    -- only one caller "wins"
```

Only when that affects **1 row**:
1. Decrement `CapacityRemaining` (existing atomic logic in `TryCreateWithCapacityAsync`) and push
   the SignalR `BookingUpdated` event.
2. Run every `IBookingConfirmedHandler` fire-and-forget (email now, WhatsApp later).

A webhook and the confirmation page can hit this at the same moment. The `WHERE Status =
PendingPayment` guard ensures emails and the capacity decrement happen exactly once.

### Capacity and slots while payment is pending

- On `POST /api/bookings`, count **Paid + unexpired Pending** bookings against capacity and the
  Private slot, so two people can't both be paying for the last spot.
- A pending booking **expires** after ~20 minutes (`ExpiresAt`). Set Cashfree's `order_expiry_time`
  to the same moment, so the order can't be paid after we've released the spot.
- A small `BackgroundService` (or a check on read) flips expired pending rows to `Expired`.
- Edge case: a payment succeeds just after expiry *and* the spot is gone. Mark the booking
  `NeedsRefund` (or keep it `Paid` + alert the admin). This is rare, so handle it manually at first.

### Config / secrets (placeholders only in `appsettings.json`)

```json
"Cashfree": {
  "_comment": "Real values via dotnet user-secrets (dev) / Azure App Service config (prod).",
  "AppId": "REPLACE_ME",
  "SecretKey": "REPLACE_ME",
  "ApiVersion": "2025-01-01",
  "ReturnUrl": "http://localhost:5173/booking/{order_id}",
  "NotifyUrl": "https://<public-api-host>/api/payments/cashfree/webhook"
}
```

Sandbox vs production base URL (`https://sandbox.cashfree.com/pg` / `https://api.cashfree.com/pg`)
comes from `PaymentSettings.Environment`, which is already in the DB. Headers on every call:
`x-client-id`, `x-client-secret`, `x-api-version`.

Webhooks need a **public** URL. In local dev, use a tunnel (ngrok / VS dev tunnels) or rely on the
confirmation page's status check (which works without webhooks).

---

## 6. Frontend

### Pay Now (registration screen, `FormPage.jsx`)

```js
import { load } from "@cashfreepayments/cashfree-js";   // npm i @cashfreepayments/cashfree-js

const res = await fetch(`${API_BASE}/api/bookings`, { method: "POST", ...body });
const { bookingRef, paymentSessionId, environment } = await res.json();

if (!paymentSessionId) return navigate(`/booking/${bookingRef}`);   // free form

const cashfree = await load({ mode: environment === "Production" ? "production" : "sandbox" });
cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });   // later: "_modal"
```

- Remove the Razorpay script and `window.Razorpay` code.
- The form needs a **Phone** field (Cashfree requires `customer_phone`). It already exists as a
  predefined field. Make it required on paid forms, or have the API reject the booking with a clear message.
- The booking card on the registration screen already shows the total. Make sure the number shown
  matches the server's formula (§5).

### New page: `/booking/:ref`, the confirmation page

Files, following the section + config split:
`Component/pages/BookingConfirmation.jsx`, `Component/Sections/BookingStatusView.jsx`,
`Component/Config/bookingConfirmation.config.jsx` (all copy, colours and icons).

States, driven by `GET /api/bookings/{ref}` (poll every 2–3 s for up to ~30 s while pending):

| Status | Shows |
|---|---|
| `PendingPayment` | "Confirming your payment…" spinner |
| `Paid` / `Submitted` | ✓ **Booking Confirmed**, the big booking ID with a copy button, experience title, date, guests, amount paid, "Confirmation sent to your email", WhatsApp group button (later), Add to calendar (later) |
| `Failed` | "Payment didn't go through", **Try again** (→ `/retry`) and Back to experience |
| `Expired` | "This booking hold expired", **Book again** |
| still pending after 30 s | "We're still waiting for the bank. You'll get an email once it's confirmed. Your booking ID is AT-…" |

The registration steps strip (`Choose → Your details → Payment`) gets a 4th step, **Confirmed**,
lit on this page.

---

## 7. Build order: what to do first

1. **Cashfree sandbox account** → get the test App ID + Secret Key, put them in `dotnet user-secrets`.
   Set the brand logo and colours in the Cashfree dashboard.
2. **Migration**: `BookingRef` + the gateway-neutral columns + `Quantity`/`Phone`/`PaidAt`/`ExpiresAt`,
   and the `PaymentWebhookEvents` table. Rename the Razorpay columns (a data-preserving rename).
3. **`CashfreePaymentGateway`**: `CreateOrderAsync` + `GetOrderStatusAsync`. Test both from
   `ArchaeoTrails.Api.http` against the sandbox.
4. **`BookingService` + `POST /api/bookings` + `GET /api/bookings/{ref}`**, including the
   server-side amount and the idempotent `ConfirmAsync`. Unit-test the amount maths and the confirm guard.
5. **Frontend**: Pay Now → Cashfree redirect → `/booking/:ref` confirmation page.
   *At this point the whole flow works end to end, without webhooks.*
6. **Webhook endpoint** + signature verification + event log (needs a tunnel in dev).
7. **Expiry / hold** for pending bookings + the retry endpoint + the failed/expired UI states.
8. Switch `redirectTarget` to `"_modal"` if you'd rather stay on-site.
9. → Next phase (§8): email + WhatsApp.

Steps 1–5 are the minimum to see "Booking Confirmed, AT-XXXXXX" in the browser.

---

## 8. Next phase: notifications (email + WhatsApp group link)

Everything hangs off one hook, so adding a channel never touches payment code:

```csharp
public interface IBookingConfirmedHandler
{
    Task HandleAsync(FormSubmission booking, ExperienceTemplate? experience);
}
// Program.cs — register as many as needed; ConfirmAsync runs them all:
builder.Services.AddScoped<IBookingConfirmedHandler, BookingEmailHandler>();      // phase 2
builder.Services.AddScoped<IBookingConfirmedHandler, WhatsAppLinkHandler>();     // phase 3
```

- **Email**: reuse `ZohoEmailService`. Send the customer a confirmation with the booking ID, date,
  guests, amount and meeting point, and send the owner a "new booking" notice. Log each send in `BookingNotifications`.
- **WhatsApp group link, simple version**: an Admin pastes the group invite link on the experience.
  It is shown on the confirmation page and in the email **only for paid bookings** (never public),
  so no WhatsApp API is needed.
- **WhatsApp message, later**: the WhatsApp Business Cloud API (Meta) or a provider (Gupshup,
  Interakt, AiSensy) sends a template message ("Booking AT-XXXX confirmed, join the group: …") to
  the customer's phone. Templates need Meta approval, so apply early. It plugs in as another
  `IBookingConfirmedHandler`.
- For reliability later: move the handlers to an **outbox** (a `BookingNotifications` row written in
  the same transaction as the confirm, sent by a `BackgroundService` with retries) instead of
  `Task.Run`, so a server restart can't drop a confirmation email.

---

## 9. Security checklist

- [ ] The amount is computed on the server only. The client never sends a price.
- [ ] Paid only via Cashfree `GET /orders/{id}` = `PAID`, or a signature-verified webhook. Never via `return_url`.
- [ ] Webhook signature verified on the **raw** request body (enable buffering, and don't model-bind first).
- [ ] The Cashfree Secret Key stays server-side (user-secrets / Azure config). The frontend gets only `paymentSessionId`.
- [ ] `GET /api/bookings/{ref}` returns no email, phone or form data. The booking ref is unguessable enough (6 chars from 31 symbols ≈ 887M combinations), and the endpoint is rate-limited.
- [ ] `ConfirmAsync` is idempotent (conditional update).
- [ ] Also check the order amount returned by Cashfree against the booking's stored amount before confirming.
- [ ] Add the production site origin to CORS. The webhook route is excluded from CORS (it's server-to-server).

---

## 10. Open questions (decide before step 4)

1. **Fees**: is the experience `Price` what the customer pays (fees absorbed), or are platform and
   gateway fees added on top at checkout? (`PaymentSettings.PricingMode` exists, but the checkout
   doesn't use it yet.)
2. **Private pricing**: is a Private booking priced per person (× max(qty, min people)) or as a flat
   private price? There's only one `Price` field today.
3. **Hold time** for a pending booking: 15 or 20 minutes?
4. **Refunds/cancellations**: manual via the Cashfree dashboard for now, or an admin "Refund" button (Cashfree Refund API)?
5. **Popup vs redirect** as the final UX (the backend is the same either way).
