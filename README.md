# ClubLedger

Sales-tracking and commission-management system for nightlife sales/marketing companies. Multi-club, white-label, deployed **one instance per operator company** — each company runs its own ClubLedger with its own clubs, ambassadors, rate plans, and branding. (First production instance: 9 Degrees, Malaysia.)

Single full-stack Nuxt 4 application — SPA frontend + Nitro server routes + Drizzle ORM + MySQL — designed to deploy as one Node service on CloudPanel.

## Stack

- Nuxt 4 (SPA, `ssr: false`)
- Nitro server routes under `server/api/v1/*`
- Drizzle ORM + MySQL2
- Pinia (auth state)
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- JWT auth (jsonwebtoken + bcryptjs)
- unpdf for POS statement imports · Puppeteer for PDF generation
- Vitest + happy-dom

## Setup

1. `cp .env.example .env` and fill in DB credentials + a JWT secret.
2. `pnpm install`
3. Create the MySQL database (e.g. `CREATE DATABASE clubledger;` — name must match `NUXT_DB_NAME`).
4. `pnpm db:migrate` — applies the schema.
5. `pnpm dev` — opens at http://localhost:3000

A fresh install redirects to the **`/setup` wizard** (owner account → company → first club). There are no seeded default users; the wizard creates the owner. Production boot refuses the dev JWT secret.

## Build / deploy

```bash
pnpm build
node .output/server/index.mjs
```

Reverse-proxy 80/443 → the configured port via CloudPanel.

Required env vars (set via CloudPanel "Site Vars" or `.env`):

```
NUXT_DB_HOST, NUXT_DB_PORT, NUXT_DB_NAME, NUXT_DB_USER, NUXT_DB_PASSWORD
NUXT_JWT_SECRET
NUXT_PUBLIC_APP_URL
NUXT_STORAGE_ROOT        # uploads (logos, receipts, payslips)
```

Note: Node ≥ 20 required (`@nuxt/cli` uses `styleText`).

## Core concepts

- **Clubs** — every company manages one or more clubs; roles (rate plans), teams, ambassadors, sale types, sales, and payouts are club-scoped via the `X-Club-Id` header. Per-club branding (name, logo) and currency symbol drive the whole UI and all PDFs.
- **Rate plans** — per-club commission plans with a base rate, optional per-sale-type overrides, optional bonus rate, and optional KPI threshold. Rates **freeze onto sales at confirmation** — changing a plan never rewrites history; payslips always match what was actually paid.
- **PDF import** — POS statements are auto-detected per file by a parser registry (`server/import/parsers.ts`); supporting a new club's format = one parser object + tests. Three-layer dedupe: dry-run duplicate flagging → commit pre-filter → DB unique index on `(club_id, external_order_id)`. Statement totals (including per-column totals on multi-amount-column formats) are reconciled before anything commits.
- **Access** — company staff log in with tier-based defaults (owner/admin/ambassador) plus owner-managed per-user club access and a per-module view/edit permission matrix. Owner-protection is flag-based (`roles.is_owner`), not name-based.
- **Reports** — payout payslips, receipts, and weekly/range commission report PDFs, all rendered from stored (frozen) figures.

## Tests

```bash
pnpm test:run   # one-shot
pnpm test       # watch mode
```

Coverage focuses on the load-bearing logic: the commission engine (worked example end-to-end, frozen-rate snapshots, draft/voided exclusion), sale confirm/void state machine, payout batch creation, import parser registry (per-format fixtures incl. positional column classification), import commit (per-row sale types, dedupe, rate freezing), permissions, and JWT round-trip.
