# Master Prompt — Pay-to-Submit Form Generator

Status: **planning + dry (skeleton) code only. Nothing here is wired to a real
payment gateway or a live database yet.**

Use this document as the brief to hand to Claude (or any dev) when it's time
to turn the skeleton in this repo into a working feature. It captures the
decisions already made, the exact flow, the data model, the API contract, and
what's stubbed vs. real today.

---

## 1. The feature, in one paragraph

An admin creates a **form** (a set of fields + a price) inside the existing
.NET API. The site can then share that form as a **link or a QR code**. Anyone
who opens the link fills in the fields, is taken to a **Razorpay** checkout for
the form's price, and — **only after Razorpay payment is verified
server-side** — the submission is saved to **Azure SQL Database** and two
emails go out: one to the site owner (new submission notification) and one to
the person who filled the form (payment + submission confirmation).

Unpaid attempts must never be saved as successful submissions.

---

## 2. Decisions locked in (don't re-litigate these)

| Decision | Choice | Why |
|---|---|---|
| Payment gateway | **Razorpay** | Indian company already has UPI in Sanity `contact` schema; Razorpay supports UPI/cards/netbanking. |
| Database | **Azure SQL Database**, via EF Core | Fits the existing .NET Clean Architecture backend naturally; relational is fine since form fields are a small, bounded set per form. |
| Where the feature lives | **Extend `hertiagewalkApi`** (the .NET Clean Architecture API), not Sanity/serverless | Keeps payment + persistence + email in one trusted backend instead of splitting logic across CMS + client. |
| Form field definitions | Stored as a `NVARCHAR(MAX)` **JSON column** (`FieldsJson`) on `FormTemplate`, not a normalized fields table | Forms are admin-authored and low-volume; JSON keeps the schema flexible (add a field type without a migration) while still living in SQL. |
| QR code generation | **Server-side**, via `QRCoder` NuGet package, served as a PNG from the API | Avoids adding a QR JS dependency to the frontend bundle; also makes the QR trivially embeddable in emails/print. |

---

## 3. End-to-end flow

```
Admin (future admin UI, not built yet)
   │  creates FormTemplate {title, fields[], price, currency}
   ▼
POST /api/forms                              (admin-only, TODO auth)
   │
   ▼
FormTemplate saved → slug generated → shareable at
   https://archaeotrails.com/forms/{slug}
   │
   ├── QR code:  GET /api/forms/{slug}/qr  → PNG of that URL
   └── Share button: navigator.share() / copy-link fallback

Recipient scans QR or clicks link
   ▼
Frontend: FormPage.jsx  → GET /api/forms/{slug}   (public, read-only schema)
   │ renders fields from FieldsJson
   ▼
Recipient fills form, clicks "Pay & Submit"
   ▼
Frontend → POST /api/forms/{slug}/order            {amount, currency}
   │  backend calls Razorpay Orders API, returns razorpayOrderId + key
   ▼
Frontend opens Razorpay Checkout widget with that order
   │  user pays
   ▼
Razorpay returns {razorpay_payment_id, razorpay_order_id, razorpay_signature}
   ▼
Frontend → POST /api/forms/{slug}/submit
   {formData, razorpay_payment_id, razorpay_order_id, razorpay_signature}
   ▼
Backend:
   1. Recompute HMAC-SHA256(order_id + "|" + payment_id, key_secret)
      and compare to razorpay_signature.  ← THE ONLY SOURCE OF TRUTH
      for "did they actually pay". Never trust a client-sent "success" flag.
   2. If valid → save FormSubmission (Status = Paid) to Azure SQL.
   3. Fire-and-forget: email site owner (admin) + email submitter
      (via IEmailService, same pattern as ContactController).
   4. Return { success: true, submissionId }.
   If invalid → return 400, do NOT save a submission.
```

**Recommended hardening (do before going live, not required for the dry
scaffold):** also register a Razorpay **webhook**
(`payment.captured` / `order.paid`) as a second, server-to-server confirmation
path, since a user closing the tab right after paying but before step 4 above
would otherwise leave a paid-but-unsubmitted order. The webhook can
reconcile/complete such orders using the `RazorpayOrderId` already stored when
the order was created.

---

## 4. Data model (Azure SQL, via EF Core)

```
FormTemplate
├─ Id            (Guid, PK)
├─ Title         (string)
├─ Slug          (string, unique)      -- used in the public URL
├─ FieldsJson     (string, JSON array) -- [{ name, label, type, required }, ...]
├─ Price          (decimal)            -- in the smallest currency unit at API boundary (paise)
├─ Currency       (string, default "INR")
├─ IsActive       (bool)
├─ CreatedAt      (DateTime)
└─ FormSubmissions (nav collection)

FormSubmission
├─ Id                  (Guid, PK)
├─ FormTemplateId      (Guid, FK → FormTemplate)
├─ DataJson            (string, JSON)  -- the filled-in field values
├─ SubmitterName       (string, nullable)
├─ SubmitterEmail      (string, nullable) -- who the confirmation email goes to
├─ AmountPaid          (decimal)
├─ Currency            (string)
├─ RazorpayOrderId     (string)
├─ RazorpayPaymentId   (string, nullable until paid)
├─ Status              (enum: PendingPayment | Paid | Failed)
└─ CreatedAt            (DateTime)
```

---

## 5. API contract (all under `hertiagewalkApi`)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/forms` | admin (TODO) | Create a `FormTemplate` |
| `GET` | `/api/forms/{slug}` | public | Return the form's schema (title, fields, price) for rendering — **never** returns other submissions' data |
| `GET` | `/api/forms/{slug}/qr` | public | PNG QR code pointing at `https://<site>/forms/{slug}` |
| `POST` | `/api/forms/{slug}/order` | public | Create a Razorpay order for that form's price; returns `{ orderId, amount, currency, razorpayKeyId }` |
| `POST` | `/api/forms/{slug}/submit` | public | Verify Razorpay signature, persist `FormSubmission`, send both emails |

Admin CRUD (list/update/deactivate forms, list submissions per form) is
deliberately **not** in the dry scaffold — call it out as a follow-up once
there's an admin auth story (API key header at minimum, proper auth ideally).

---

## 6. What's real vs. stubbed in this repo right now

| Layer | File | State |
|---|---|---|
| Domain entities | `ArchaeoTrails.Domain/Entities/FormTemplate.cs`, `FormSubmission.cs` | Real shape, no behavior. |
| DbContext | `ArchaeoTrails.Infrastructure/Data/AppDbContext.cs` | Real EF Core mapping. **Needs `Microsoft.EntityFrameworkCore.SqlServer` + `Microsoft.EntityFrameworkCore.Design` NuGet packages and a real `ConnectionStrings:AzureSql` before it will build/run.** |
| Repositories | `EfFormTemplateRepository.cs`, `EfFormSubmissionRepository.cs` | Real CRUD against the DbContext. |
| Payment | `RazorpayPaymentService.cs` | **Stubbed.** `CreateOrderAsync` returns a fake order id; `VerifySignature` always returns `true`. Marked with `// TODO(form-generator)`. Needs the `Razorpay.Api` NuGet package + real `RazorpaySettings:KeyId` / `KeySecret`. |
| Controller | `FormsController.cs` | Real routing/wiring, calls the (stub) services above. |
| Emails | Reuses existing `IEmailService` | Real — but only has a `SendContactEmailAsync` method today; the scaffold assumes new methods `SendFormSubmissionOwnerEmailAsync` / `SendFormSubmissionConfirmationEmailAsync` will be added the same way `SendContactEmailAsync` was. |
| Frontend | `FormPage.jsx`, `FormShare.jsx`, `form.config.jsx` | Real rendering + Razorpay Checkout call, pointed at the endpoints above. **Needs the Razorpay Checkout `<script>` added and `VITE_API_URL` set**, same env var `Contact.jsx` already uses. |

---

## 7. Required setup before this goes from "dry" to real

1. **NuGet packages** (run from `hertiagewalkApi/ArchaeoTrails.Infrastructure`):
   ```bash
   dotnet add package Microsoft.EntityFrameworkCore.SqlServer
   dotnet add package Microsoft.EntityFrameworkCore.Design
   dotnet add package Razorpay.Api
   dotnet add package QRCoder
   ```
2. **Azure SQL**: create the database, then from `hertiagewalkApi/ArchaeoTrails.Api`:
   ```bash
   dotnet ef migrations add InitFormGenerator -p ../ArchaeoTrails.Infrastructure -s .
   dotnet ef database update -p ../ArchaeoTrails.Infrastructure -s .
   ```
3. **Secrets** — do not put real values in `appsettings.json`. Use
   `dotnet user-secrets` locally and Azure App Service "Configuration" in
   prod:
   - `ConnectionStrings:AzureSql`
   - `Razorpay:KeyId`, `Razorpay:KeySecret`
4. **Frontend**: add the Razorpay Checkout script to `index.html`:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```
5. Register the new services/DbContext in `Program.cs` (already done in the
   dry scaffold — just confirm after adding the NuGet packages that it
   compiles).

---

## 8. Explicit non-goals (for the dry scaffold)

- No admin authentication/authorization yet — every `/api/forms*` write
  endpoint should be treated as **not safe to deploy publicly** until an auth
  check is added.
- No Razorpay webhook handler yet (see hardening note in §3).
- No retry/idempotency handling if the email send fails after a successful
  payment — submission is still saved; failed emails should at minimum be
  logged (`TODO`) so they can be resent manually.
- No admin UI for building forms — `POST /api/forms` must be called directly
  (e.g. via `curl`/Postman) until one exists.
