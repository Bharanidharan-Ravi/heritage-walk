# Bookings & Payments: Go-Live Checklist and Phase 2 Backlog

Status (2026-10-06): the code side of go-live is done. Part A is the setup only you can do
(real keys, Azure settings, the Cashfree dashboard). Part B is the next-phase work.

Related: [CASHFREE_BOOKING_PLAN.md](CASHFREE_BOOKING_PLAN.md) (the design) and
[MASTER_PROMPT.md](MASTER_PROMPT.md) (the original form-generator spec).

---

## What was built for go-live

| # | Item | Where |
|---|---|---|
| 1 | **Cashfree webhook**: `POST /api/payments/cashfree/webhook`. Verifies `x-webhook-signature` over the raw body, stores every verified event in `PaymentWebhookEvents`, then **re-asks Cashfree** for the order before confirming. The webhook body alone is never trusted. If Cashfree can't be reached, it answers 503 so Cashfree resends it. | `PaymentWebhooksController`, `BookingService.HandleGatewayWebhookAsync`, `CashfreePaymentGateway.ParseWebhook` |
| 2 | **Expiry worker**: every 2 min, finds pending bookings whose hold ended more than 5 min ago. It asks Cashfree for each one: **paid → confirmed** (this catches a missed webhook); otherwise → `Expired`. | `Api/Background/BookingExpiryWorker.cs`, `BookingService.ExpireStaleHoldsAsync` |
| 3 | **Retry**: `POST /api/bookings/{ref}/retry` returns the *same* order's payment session while the hold is live. The `/booking/:ref` page shows a **Complete payment** button when the payment hasn't come in. | `BookingService.RetryPaymentAsync`, `BookingStatusView.jsx` |
| 4 | **Rate limiting** per client IP: 60/min for status reads, 10/min for create and retry. Over the limit → 429 with a friendly message. | `Program.cs`, `BookingsController` |
| 5 | **CORS from config**: `Cors:AllowedOrigins`. **Database by environment**: Development → `SqlServerConnection`, everywhere else → `AzureSql`. Startup now fails with a clear message if the connection string is missing. | `Program.cs`, `appsettings.json` |

Also:
- **Late payments.** A payment that lands after its hold expired is still confirmed, because the money was taken. The webhook log row says so, so you can check the capacity and the Private date by hand.
- **Payment ID.** The Cashfree payment id (`cf_payment_id`) is saved on the booking when the webhook confirms it.
- **Migration.** `20261006153910_AddPaymentWebhookEvents` adds the `PaymentWebhookEvents` table and an index on `FormSubmissions (Status, ExpiresAt)`.

---

## Part A: Setup you need to do before going live

### A1. Apply the new migration

```bash
cd hertiagewalkApi
dotnet ef database update --project ArchaeoTrails.Infrastructure --startup-project ArchaeoTrails.Api
```

For Azure SQL, run it once against production. First allow your IP (Azure SQL server → Networking → Add
your client IPv4 address), and run `az login` if the connection string uses `Active Directory Default`:

```bash
cd hertiagewalkApi
dotnet ef database update --project ArchaeoTrails.Infrastructure --startup-project ArchaeoTrails.Api --configuration Release --connection "<Azure SQL connection string>"
```

It applies every migration the database doesn't have yet, so it's safe on an existing or empty database.
Alternatively, generate a script with `dotnet ef migrations script --idempotent` and run that in the Azure
portal's query editor.

### A2. Secrets: local development (`dotnet user-secrets`)

Run these from `hertiagewalkApi/ArchaeoTrails.Api`. Skip any you've already set.

```bash
dotnet user-secrets set "ConnectionStrings:SqlServerConnection" "<local SQL Server connection string>"
dotnet user-secrets set "Jwt:Key" "<64+ random bytes, base64>"
dotnet user-secrets set "Cashfree:Sandbox:AppId" "<sandbox App ID>"
dotnet user-secrets set "Cashfree:Sandbox:SecretKey" "<sandbox Secret Key>"
dotnet user-secrets set "EmailSettings:AppPassword" "<Zoho app password>"
dotnet user-secrets set "SeedAdmin:Email" "<first admin email>"
dotnet user-secrets set "SeedAdmin:Password" "<first admin password>"
dotnet user-secrets list   # check
```

### A3. Secrets and settings: production (Azure App Service → Configuration)

**Connection strings** tab:

| Name | Value |
|---|---|
| `AzureSql` | the Azure SQL connection string (type: SQLAzure) |

**Application settings** tab (`__` stands for `:`):

| Name | Value |
|---|---|
| `Cashfree__Sandbox__AppId` / `Cashfree__Sandbox__SecretKey` | **test** keys, used while Admin → Payment settings is on Sandbox |
| `Cashfree__Production__AppId` / `Cashfree__Production__SecretKey` | **live** keys, used once Admin is switched to Production (both secrets verify webhook signatures) |
| `Cashfree__ReturnUrl` | `https://archaeotrails.com/booking/{order_id}` |
| `Cashfree__NotifyUrl` | `https://<your-api-host>/api/payments/cashfree/webhook` |
| `EmailSettings__AppPassword` | Zoho app password (booking confirmation emails need it) |
| `Jwt__Key` | a new random key, not the dev one |
| `SeedAdmin__Email` / `SeedAdmin__Password` | first admin account (can be removed after the first start) |
| `Cors__AllowedOrigins__3` | only if the site is served from another origin too (e.g. an `*.azurestaticapps.net` URL) |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | `true`, but **only on a Linux App Service**, so rate limiting sees each visitor's real IP |

Then, in the **Admin panel → Payment settings**, pick the environment: **Sandbox** uses the
`Cashfree__Sandbox__*` keys (test payments, no real money), **Production** uses the `Cashfree__Production__*`
keys. Switching needs no restart or redeploy; each booking remembers which one it was created in.

### A4. Cashfree dashboard

1. **Developers → Webhooks**: add `https://<your-api-host>/api/payments/cashfree/webhook` for the
   *Payment* events, on webhook version **2023-08-01** (it matches `Cashfree:ApiVersion`). Use
   **Test** there: the API should answer 200, and the unknown test order is logged and ignored.
2. **Payment page branding**: logo, name and colours.
3. Do one **real ₹1 booking** in production end to end: pay, see "Booking Confirmed", get the email,
   and check that a `PaymentWebhookEvents` row says `Confirmed.`

### A5. Testing the webhook locally (optional)

Cashfree can only reach a public https URL. Use a tunnel (`ngrok http https://localhost:7244`, or a VS dev tunnel), set
`Cashfree:NotifyUrl` in user-secrets to `<tunnel-url>/api/payments/cashfree/webhook`, and pay a sandbox
order. Without a tunnel everything still works: the `/booking/:ref` page and the expiry worker confirm
payments by asking Cashfree directly.

### A6. Don't publish yet

- **Paid forms not linked to an experience** still use the old Razorpay path, which has no keys and
  no checkout script. Keep such forms free, or link them to an experience, until B1 is done.

---

## Part B: Phase 2 backlog

Roughly in priority order.

### B1. Move standalone paid forms onto Cashfree bookings
`POST /api/forms/{slug}/order` and `/submit` still use `RazorpayPaymentService` (a stub). Move them
onto `BookingService`, using the form's own price when there's no experience, then delete the Razorpay
code and its config section.

### B2. Reliable emails (outbox)
- Confirmation emails are sent with `Task.Run` fire-and-forget. A restart or an SMTP error loses them
  silently. Add a `BookingNotifications` table (plan §4) written in the same transaction as the confirm,
  and a background sender with retries.
- The plain form-submission emails in `ZohoEmailService` are still placeholder plain text. Give them the
  same HTML template as the booking emails.
- Log send failures instead of swallowing them.
- Add an admin "resend confirmation" button.

### B3. WhatsApp
- Simple version: a `WhatsAppGroupLink` on the experience, shown only on the paid confirmation page and
  in the email.
- Later: WhatsApp Business API template messages (Meta approval takes time, so apply early).

### B4. QR codes
`QrCodeService` returns an empty image. Add the `QRCoder` NuGet package and implement it, then
fix the FormShare clipboard and share fallbacks (TODOs in `FormShare.jsx`).

### B5. Server-side field validation
Pattern, length and min/max rules are only checked in the browser. Re-check them in
`BookingRules` / `FormDtos` (TODO there).

### B6. Booking safety edges
- **Private dates.** The date check and the insert aren't atomic: two people paying for the same
  Private date in the same second could both get a hold. Add a unique filtered index or a transaction.
- **Late payments.** Today these are confirmed and flagged in the webhook log only. Add an admin alert
  or a `NeedsReview` status.
- **Refunds.** These are manual in the Cashfree dashboard for now. Later: an admin Refund button
  (Cashfree Refund API) plus a `Refunded` status.

### B7. Admin views
- A bookings list per experience (status, people, amount, payment id) with CSV export.
- A webhook log viewer (`PaymentWebhookEvents`).

### B8. Sanity sync
`SanityContentService` publish sync is still a stub. It needs `Sanity:WriteToken`.

### B9. Checkout UX
Optionally switch Cashfree checkout from the modal to a redirect, or to Cashfree Elements for a fully
on-brand payment form (plan §3). No backend change is needed.
