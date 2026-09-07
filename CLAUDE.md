# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

**ArchaeoTrails / Heritage Walk** — a marketing + blog website for a heritage-walk
tour company, plus a small backend that sends contact-form emails. The repo has
**three independent codebases** living side by side. They don't share a build,
so always `cd` into the right one before running package-manager or `dotnet`
commands.

| Folder | Stack | Purpose |
|---|---|---|
| `/` (root: `src/`, `index.html`, `vite.config.js`) | React 19 + Vite + Tailwind v4 + React Router 7 | The public marketing site (home, about, walks, gallery, blog, contact). |
| `hertiagewalk-backend/` | Sanity Studio (`sanity@5`) | Headless CMS admin UI. Content schemas: `blogPost`, `walk`, `galleryItem`, `shopItem`, `story`, `contact` (company settings: WhatsApp/UPI/email). |
| `hertiagewalkApi/` | .NET 8 Web API, Clean Architecture (`Api` / `Application` / `Domain` / `Infrastructure`) | Small API currently used only to send the Contact form email via Zoho SMTP. Untracked/new — being extended (see Form Generator below). |

Note the folder is spelled **`hertiagewalk-backend`** and **`hertiagewalkApi`**
(missing "e" in "heritage") — this is an existing typo in the repo, not a
mistake to "fix" silently; keep it consistent when adding files.

## Frontend (`/src`)

- Entry: `src/main.jsx` → `src/App.jsx` (routes) → `Component/Layout/Layout.jsx`.
- Content data comes from **Sanity** via `src/sanityClient.js`
  (`projectId: nh8jhz7r`, `dataset: production`). Use `urlFor()` for image URLs.
- Pages live in `Component/pages/`, page sections in `Component/Sections/`,
  and each section's copy/theme lives in a matching file under
  `Component/Config/*.config.jsx` (e.g. `Contact.jsx` reads from
  `contact.config.jsx`). Follow this **section + config-object** split for any
  new section — don't hardcode copy/colors inside JSX.
- Some Sections have a `... copy.jsx` sibling (e.g. `BlogPost copy.jsx`) that
  is commented out of `App.jsx` — treat those as old/experimental, not dead
  code to delete without asking.
- Calls to the .NET API read the base URL from `import.meta.env.VITE_API_URL`
  (see `Contact.jsx`) — never hardcode the API host.
- Styling is Tailwind utility classes plus inline `style={{ ... }}` driven by
  the section's `theme` config object; match that pattern rather than adding
  new CSS files.

## Sanity Studio (`hertiagewalk-backend`)

- Schemas are plain JS objects exported from `schemaTypes/*.js` and registered
  in `schemaTypes/index.js`. Adding a content type = add a schema file + wire
  it into that index.
- Run with `pnpm dev` (or `sanity dev`) from inside `hertiagewalk-backend/`.

## .NET API (`hertiagewalkApi`)

- Clean Architecture, 4 projects: `ArchaeoTrails.Api` (controllers, DI wiring
  in `Program.cs`), `ArchaeoTrails.Application` (interfaces + per-feature
  request/DTO types under `Features/<FeatureName>/`), `ArchaeoTrails.Domain`
  (entities, currently empty), `ArchaeoTrails.Infrastructure` (concrete
  service implementations).
- Pattern to follow for any new feature (see `Contact` as the reference):
  1. `Domain` — entity classes, if the feature persists data.
  2. `Application/Interfaces/I<Thing>Service.cs` — the abstraction.
  3. `Application/Features/<Feature>/*.cs` — request/response DTOs.
  4. `Infrastructure/Services/<Concrete>Service.cs` — implementation.
  5. `Api/Controllers/<Feature>Controller.cs` — thin controller that injects
     the interface (never the concrete class) and does the real work via
     `Task.Run(...)` fire-and-forget for anything the caller shouldn't block on.
  6. Register the interface → implementation in `Program.cs`
     (`builder.Services.AddScoped<IThing, Concrete>()`).
- CORS is locked to `localhost:5173`, `archaeotrails.com`,
  `www.archaeotrails.com` in `Program.cs` — add new origins there if needed.
- Secrets (SMTP password, and soon DB connection strings / Razorpay keys)
  currently sit in `appsettings.json` in plain text. **Do not commit real
  secrets** — when adding new config sections, add matching placeholder-only
  entries in `appsettings.json` and tell the user to put real values in
  `dotnet user-secrets` (dev) or Azure App Service configuration (prod).
- Database: the API has no persistence yet. The project is moving to
  **Azure SQL Database** via EF Core — see
  [docs/form-generator/MASTER_PROMPT.md](docs/form-generator/MASTER_PROMPT.md).

## In-progress feature: Form Generator (pay-to-submit forms)

A new capability is being scaffolded: generate a shareable form (QR code or a
share link/button) → recipient fills it in → pays via **Razorpay** → on
verified payment success the submission is saved to **Azure SQL** and a
notification email goes to both the site owner and the person who filled the
form (reusing `IEmailService`/`ZohoEmailService`).

Full spec, data model, API contract, and security notes:
**[docs/form-generator/MASTER_PROMPT.md](docs/form-generator/MASTER_PROMPT.md)**

The current backend/frontend files for it are **dry/skeleton code** — they
compile-shaped but use stub logic (`TODO`, `NotImplementedException`, or fake
success) in place of real Razorpay/EF Core calls until the NuGet packages are
installed and real keys/connection strings are supplied. Look for `// TODO(form-generator)`
comments before treating any of it as production-ready.

## Commands

```bash
# Frontend
npm install && npm run dev        # from repo root
npm run build
npm run lint

# Sanity Studio
cd hertiagewalk-backend && pnpm dev

# .NET API
cd hertiagewalkApi/ArchaeoTrails.Api && dotnet run
```

## House rules for Claude in this repo

- Don't touch `bin/`, `obj/`, `node_modules/`, `.vs/` — build/tooling output,
  never hand-edit (see `.claudeignore`).
- Match existing naming even where it looks like a typo (`hertiagewalk*`,
  `Contact.jsx`/`contact.config.jsx` lowercase-first convention) rather than
  "correcting" it mid-task.
- When adding a .NET feature, follow the existing 4-project Clean
  Architecture split and the Contact-feature pattern above instead of
  collapsing logic into the controller.
- When adding a payment or DB integration, never invent working credentials —
  use placeholders + `TODO` comments and say explicitly what secret/package
  the user still needs to add.
