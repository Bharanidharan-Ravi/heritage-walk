# ArchaeoTrails — Heritage Walk

The marketing site, headless CMS, and API for **ArchaeoTrails**, a heritage-walk tour
company. This repo is a monorepo: one place for the public website, its content
backend, and the .NET API that powers contact forms and (in progress) paid,
shareable form submissions.

> Live site: [archaeotrails.com](https://archaeotrails.com)

## What's in here

Three independent codebases, side by side. They don't share a build — `cd` into
the right folder before running any package-manager or `dotnet` command.

| Folder | Stack | What it does |
|---|---|---|
| [`/`](.) (root) | React 19 · Vite · Tailwind CSS v4 · React Router 7 | The public site — home, about, walks, gallery, blog, contact, and the pay-to-submit form flow. |
| [`hertiagewalk-backend/`](hertiagewalk-backend) | Sanity Studio 5 | Headless CMS admin for all content: blog posts, walks, gallery items, shop items, stories, and company/contact settings. |
| [`hertiagewalkApi/`](hertiagewalkApi) | .NET 8 Web API · Clean Architecture | Sends contact-form email (Zoho SMTP) and is being extended with Razorpay payments + Azure SQL for the form generator feature. |

*(Yes, `hertiagewalk-backend` / `hertiagewalkApi` are missing an "e" in "heritage"
— that's an intentional, existing naming convention across the project, kept
consistent on purpose rather than silently "fixed".)*

## Architecture

```
                        ┌────────────────────────┐
                        │   Sanity Studio (CMS)   │
                        │  hertiagewalk-backend/  │
                        └───────────┬─────────────┘
                                    │ content (blog, walks,
                                    │ gallery, shop, stories)
                                    ▼
┌──────────────────┐      ┌─────────────────────┐      ┌───────────────────────┐
│  Visitor browser  │◄────►│  React + Vite site   │─────►│   .NET 8 Web API      │
│                   │      │  (this repo, /src)   │      │  hertiagewalkApi/     │
└──────────────────┘      └─────────────────────┘      └───────────┬───────────┘
                                                                     │
                                              ┌──────────────────────┼──────────────────────┐
                                              ▼                      ▼                      ▼
                                        Zoho SMTP              Razorpay API            Azure SQL
                                     (contact emails)         (form payments)      (form submissions)
```

## Features

- **Marketing pages** — home, about, walks catalogue, gallery, blog, and contact,
  all content-driven from Sanity.
- **Blog** powered by Sanity's Portable Text, rendered with `@portabletext/react`.
- **Contact form** that emails the site owner via the .NET API + Zoho SMTP.
- **Form Generator** *(in progress)* — build a shareable form, hand it out as a
  QR code or link, collect a Razorpay payment on submit, then persist the
  submission to Azure SQL and email both the site owner and the submitter.
  See the full spec in [`docs/form-generator/MASTER_PROMPT.md`](docs/form-generator/MASTER_PROMPT.md).

## Tech stack

**Frontend** — React 19, Vite 7, Tailwind CSS v4, React Router 7, Sanity Client + image URL builder.
**CMS** — Sanity Studio 5 (schema-as-code content types).
**Backend** — .NET 8, ASP.NET Core Web API, Clean Architecture (Api / Application / Domain / Infrastructure), EF Core (Azure SQL, in progress), Razorpay SDK (in progress).

## Getting started

### Prerequisites

- Node.js 18+ and npm (frontend)
- pnpm (Sanity Studio)
- .NET 8 SDK (API)

### 1. Frontend (marketing site)

```bash
npm install
npm run dev        # http://localhost:5173
npm run build       # production build
npm run lint
```

Reads its Sanity project (`nh8jhz7r` / `production`) via `src/sanityClient.js`,
and the API base URL from `VITE_API_URL` (create a `.env` at the repo root):

```bash
# .env
VITE_API_URL=https://localhost:5001
```

### 2. Sanity Studio (content admin)

```bash
cd hertiagewalk-backend
pnpm install
pnpm dev            # http://localhost:3333
```

Add or edit content types in `schemaTypes/*.js`, then register new ones in
`schemaTypes/index.js`.

### 3. .NET API

```bash
cd hertiagewalkApi/ArchaeoTrails.Api
dotnet restore
dotnet run
```

Secrets (SMTP password, Azure SQL connection string, Razorpay keys) are **never**
committed — `appsettings.json` only holds placeholders. Set real values with:

```bash
cd hertiagewalkApi/ArchaeoTrails.Api
dotnet user-secrets set "EmailSettings:AppPassword" "<zoho-app-password>"
dotnet user-secrets set "ConnectionStrings:AzureSql" "<connection-string>"
dotnet user-secrets set "Razorpay:KeyId" "<key-id>"
dotnet user-secrets set "Razorpay:KeySecret" "<key-secret>"
```

In production these come from Azure App Service configuration instead.

## Repository conventions

- **Section + config split** — every page section under `src/Component/Sections/`
  pairs with a matching `*.config.jsx` file under `src/Component/Config/` that
  holds its copy and theme. New sections should follow the same pattern rather
  than hardcoding copy or colors inline.
- **.NET feature pattern** — new backend features follow the `Contact` feature
  as a template: `Domain` entity → `Application/Interfaces` abstraction →
  `Application/Features/<Feature>` DTOs → `Infrastructure/Services` concrete
  implementation → a thin `Api/Controllers` controller wired through DI in
  `Program.cs`.
- **CORS** is locked to `localhost:5173`, `archaeotrails.com`, and
  `www.archaeotrails.com` in `Program.cs`.

See [`CLAUDE.md`](CLAUDE.md) for the full internal contributor guide.

## Roadmap

- [ ] Wire up real Razorpay payment verification
- [ ] Azure SQL persistence via EF Core for form submissions
- [ ] QR code generation for shareable forms
- [ ] Notification emails to owner + submitter on successful payment

## License

Private / all rights reserved — ArchaeoTrails.
