\ Form Generator — Predefined Fields & Builder UX Plan

Status: **plan only, nothing implemented yet.** Companion to
[MASTER_PROMPT.md](MASTER_PROMPT.md), which stays the source of truth for the
payment/submission pipeline. This doc covers making the builder as fast to use
as Google Forms / Zoho Forms.

---

## 0. The storage decision (answered first, because everything else depends on it)

**Question:** keep the predefined field catalogue in a SQL table, or in the UI?

**Decision: keep the catalogue in the UI as a static config. Do not create a
`FieldTypes` / `FieldCatalog` table.**

### Why

The free Azure SQL offer is *General Purpose Serverless* — the scarce resource
is **vCore-seconds per month (100k) plus auto-pause**, not storage (32 GB).
Two consequences drive this:

1. **Every query costs budget.** A catalogue table would be read on *every*
   builder page load, by every admin, forever — to return data that is
   identical for all of them and changes only when we ship code.
2. **Auto-pause makes cold reads expensive in wall-clock time.** After the DB
   idles it suspends; the next query pays a ~30–60s resume. Putting the field
   palette behind the DB means the builder can appear frozen on first open —
   the exact opposite of "faster to create a form".

A static config has none of that: zero vCore-seconds, zero latency, ships in
the JS bundle, is versioned in git, and reviews like code.

### What *does* stay in the DB

Nothing new. The existing shape already covers it:

- `FormTemplate.FieldsJson` — the *instance* of each field the author dropped
  onto a form, including any per-form edits. This is what makes "edit after
  drop affects only this form, not the master" work for free: the catalogue is
  a **template that is copied on drop**, never referenced by ID at render time.
- `FormSubmission.AnswersJson` — unchanged.

So: **master definitions live in code; copies live in `FieldsJson`.** No schema
change, no migration, no extra table, no extra query.

### The one thing that needs real data (and how to avoid a table for it)

The address field's *"type a pincode → city and state fill in"* behaviour needs
Indian postal data. Three options, in preference order:

| Option | Cost | Verdict |
|---|---|---|
| Public India Post API (`api.postalpincode.in/pincode/{pin}`) | free, no key, no DB | **Recommended.** Called from the browser on pincode blur, debounced. Zero backend cost. |
| Bundled JSON of states + districts (~35 states, ~780 districts, ~30 KB gzipped) | free, bundle size only | **Also ship this**, as the dropdown source *and* as the offline fallback when the API is down. |
| Pincode table in Azure SQL (~154k rows) | ~15 MB storage + a query per keystroke | **Rejected** — burns serverless compute on static reference data. |

Plan: bundle the state/district JSON in `src/Component/Config/indiaGeo.config.js`,
and use the public API only to *prefill* from a pincode. If the API fails, the
user just picks from the dropdowns — the form still works.

### File uploads — flag before we build them

The requested "upload image only / file only / both" field cannot store bytes in
Azure SQL on the free tier without eating the 32 GB and making every submission
read expensive. When we get there, uploads go to **Azure Blob Storage** and the
DB stores only the blob URL + filename + size. Noted here so it isn't a surprise
later; not part of the first phase.

---

## 1. Name and Email must become real, editable fields

**Today:** [FormRenderer.jsx:41-59](../../UI/src/Component/Sections/FormRenderer.jsx#L41-L59)
hardcodes "Your Name" and "Your Email" as two always-present, always-required,
always-half-width inputs, outside `form.fields`. The builder canvas never shows
them, so the author first sees them in preview and cannot touch them.

**Change:** delete that hardcoded block. Instead, when a new form is created,
seed `fields` with two normal field instances (`fullName`, `email`) from the
predefined catalogue. From that moment they are ordinary blocks: draggable,
renamable, resizable, un-requirable, deletable.

**The one constraint to keep:** the API needs a submitter name and email for the
confirmation email in `ZohoEmailService`. So rather than forcing the *fields* to
exist, mark them with a role:

```js
{ name: "fullName", role: "submitterName", ... }
{ name: "email",    role: "submitterEmail", ... }
```

On submit, the frontend maps whichever fields carry those roles into the
existing `submitterName` / `submitterEmail` request properties. If the author
deletes both, the builder shows a soft warning ("no email field — the
submitter won't get a confirmation"), and the backend simply skips the
submitter copy while still emailing the owner. Author keeps full control; the
system degrades gracefully instead of forbidding.

---

## 2. The predefined field catalogue

New file: `src/Component/Config/predefinedFields.config.jsx`.

Each entry is a **complete field instance ready to drop** — label, placeholder,
validation, options, width, help text, and (for composites) its sub-fields. On
drop the builder deep-clones it into `FieldsJson`. Editing the copy never
touches the master.

### Field shape (extends today's `{ name, label, type, required, width }`)

```js
{
  key: "phoneIndian",           // catalogue key, not stored on the instance
  type: "phone",
  label: "Phone Number",
  placeholder: "10-digit mobile number",
  required: true,
  width: 6,
  validation: {                 // NEW — declarative, interpreted by FormRenderer
    pattern: "^[6-9]\\d{9}$",
    message: "Enter a valid 10-digit Indian mobile number",
    maxLength: 10,
    inputMode: "numeric",
    prefix: "+91",
  },
}
```

`validation` is a new, optional, declarative block. It is the mechanism that
makes "drag and drop → all properties added automatically" true, and it is also
what the author edits in the right-hand settings pane afterwards.

### Composite fields (the address case)

Address is not one input — it is a *group*. Add one new type, `group`, whose
instance carries `children: [...]` of ordinary fields:

```js
{
  key: "addressIndian",
  type: "group",
  label: "Address",
  required: true,
  width: 12,
  behavior: "indianAddress",    // enables the pincode → city/state lookup
  children: [
    { name: "doorNo",     label: "Door / Flat Number", type: "text",   width: 6, required: true },
    { name: "street",     label: "Street Name",        type: "text",   width: 6, required: true },
    { name: "line2",      label: "Address Line 2",     type: "text",   width: 12 },
    { name: "pincode",    label: "PIN Code",           type: "text",   width: 4, required: true,
      validation: { pattern: "^[1-9]\\d{5}$", maxLength: 6, inputMode: "numeric" } },
    { name: "city",       label: "City",               type: "text",   width: 4, required: true },
    { name: "state",      label: "State",              type: "select", width: 4, required: true,
      optionsFrom: "indiaStates" },
  ],
}
```

`behavior: "indianAddress"` is the hook FormRenderer uses to wire the pincode
lookup. `optionsFrom` lets a select pull its options from a named bundled list
instead of inlining 36 strings into every saved form — smaller `FieldsJson`,
and the list can be corrected in one place. Author can still override with
literal `options` after dropping.

Answers flatten on submit as `address.doorNo`, `address.pincode`, … so
`AnswersJson` stays the flat `Dictionary<string,string>` the API already
handles. **No backend change.**

### The catalogue itself

Grouped for the palette. Every one of these is a *predefined* block that
arrives fully configured:

**Personal**
| Block | Type | What comes preconfigured |
|---|---|---|
| Full Name | text | required, placeholder, width 6, role `submitterName` |
| Email Address | email | RFC-ish pattern, placeholder, width 6, role `submitterEmail` |
| Phone Number | phone | `+91` prefix, `^[6-9]\d{9}$`, numeric keypad, max 10 |
| Emergency Contact Number | phone | same validation, different label/help text |
| Address | group | the 6 sub-fields above + pincode lookup |

**Event**
| Block | Type | Preconfigured |
|---|---|---|
| Registration Type | select | options `Individual`, `Group`, required |
| Number of Attendees | number | min 1, max 50, default 1, shown when Registration Type = Group (see §5) |
| Preferred Lunch | checkbox | options `Veg Rice`, `Sambhar Rice`, `Curd Rice` |
| How did you hear about this event? | checkbox | options `Whatsapp`, `Instagram`, `Website`, `Facebook`, `Other` + `allowOther: true` |
| Updates about upcoming events? | radio | options `Yes`, `No`, default `Yes` |

**Consent**
| Block | Type | Preconfigured |
|---|---|---|
| Terms and Conditions | terms | scrollable rich-text box + a required acknowledgement checkbox, prefilled with the ArchaeoTrails cancellation/refund policy |
| Declaration | consent | required checkbox with the standard declaration paragraph |

**Upload**
| Block | Type | Preconfigured |
|---|---|---|
| Upload Image | file | `accept="image/*"`, max 5 MB |
| Upload Document | file | `accept=".pdf,.doc,.docx"`, max 10 MB |
| Upload Any File | file | both of the above |

The existing generic blocks (Short answer, Paragraph, Dropdown, Date, Heading,
Divider, …) stay exactly as they are, in their own groups — predefined blocks
are *added alongside*, never a replacement.

### `allowOther`

For "How did you hear…", checking **Other** reveals a small text input. The
value submits as `Other: <typed text>`, so it stays a single string in the
existing answers dictionary.

---

## 3. Palette: icons, small names, two per row

Current [FieldPalette.jsx](../../UI/src/Component/Admin/FormBuilder/FieldPalette.jsx)
renders one full-width text row per block. With ~25 blocks that is an unusable
scroll.

**Change to a 2-column grid of small icon tiles:**

```
┌──────────┬──────────┐
│    👤    │    ✉     │
│   Name   │  Email   │
├──────────┼──────────┤
│    ☎     │    📍    │
│  Phone   │ Address  │
└──────────┴──────────┘
```

- `grid grid-cols-2 gap-1`, tile ≈ 64×52px, icon 16px above a 10px label.
- Groups (`Personal`, `Event`, `Consent`, `Text`, `Choice`, …) become collapsible
  headers so the rail stays short; `Personal` and `Event` open by default.
- A search box at the top filters across all groups — the single biggest speed
  win once the catalogue is this large.
- Icons: extend the inline-SVG approach already used in
  [AdminLayout.jsx](../../UI/src/Component/Admin/AdminLayout.jsx). ~25 more
  glyphs is the point where a real icon library becomes worth it — recommend
  adding `lucide-react` (tree-shaken, ~1–2 KB per used icon) rather than
  hand-drawing 25 SVGs. **Needs your OK, since it's a new dependency.**
- Widen the left rail from 168px to ~176px; drag-and-drop behaviour is unchanged.

---

## 4. What each layer has to change

| File | Change |
|---|---|
| `Config/predefinedFields.config.jsx` | **new** — the catalogue above |
| `Config/indiaGeo.config.js` | **new** — states + districts JSON |
| `Config/formBuilder.config.jsx` | add the new groups; add `group`/`terms`/`consent`/`file` to the type catalogue |
| `Sections/FormRenderer.jsx` | drop the hardcoded name/email; render `group`, `terms`, `consent`, `file`; interpret `validation`; `optionsFrom`; `allowOther`; pincode lookup |
| `FormBuilder/FieldPalette.jsx` | 2-col icon grid, collapsible groups, search |
| `FormBuilder/BuilderCanvas.jsx` | render composite `group` cards; seed name/email on new form |
| `FormBuilder/FieldSettings.jsx` | edit `validation`, edit sub-fields of a group, edit terms text |
| `AdminFormBuilder.jsx` | Preview / Save / Cancel already exist — add **Submit-label** config; wire seeded fields |
| `hertiagewalkApi` | **no change for phases 1–2.** Only file upload (Blob Storage) and making `submitterEmail` optional need backend work. |

---

## 5. Deliberately deferred

- **Conditional visibility** ("Number of Attendees" only when type = Group).
  Real feature, needs its own `visibleWhen` rule engine in the renderer *and*
  server-side re-validation. Phase 3 — until then the field is simply always
  visible with help text.
- **File uploads** — blocked on the Blob Storage decision in §0.
- **Per-field server-side validation.** Today the API trusts the client. The
  `validation` block is client-side only at first; mirroring it in
  `FormsController` is Phase 3 and is a *security* item, not a UX one.

---

## 6. Suggested phasing

1. **Phase 1 — foundation.** Catalogue file + `validation` support in the
   renderer + name/email become real seeded fields + the 2-column icon palette.
   Simple, non-composite predefined fields (Name, Email, Phone, Emergency
   Contact, Registration Type, Attendees, Lunch, Heard-about, Updates).
   *No backend change, no migration, no DB cost.*
2. **Phase 2 — composites.** `group` type + Indian address with pincode lookup +
   `terms` / `consent` blocks + `allowOther`. Still frontend-only.
3. **Phase 3 — the expensive ones.** File uploads via Blob Storage, conditional
   visibility, server-side validation mirror.

Phases 1 and 2 together deliver everything asked for except uploads, and cost
**zero** additional Azure SQL compute.
