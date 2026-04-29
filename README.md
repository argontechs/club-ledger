# NonoClub

Sales-tracking & commission-management web app for **Nono Club** (Malaysia, currency RM/MYR).

Single full-stack Nuxt 4 application — frontend (SPA) + Nitro server routes + Drizzle ORM + MySQL — designed to deploy as one Node service on CloudPanel.

## Stack

- Nuxt 4 (SPA, `ssr: false`)
- Nitro server routes under `server/api/v1/*`
- Drizzle ORM + MySQL2
- Pinia (auth state)
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- JWT auth (jsonwebtoken + bcryptjs)
- pdf-parse for POS PDF imports
- Vitest + happy-dom

## Setup

1. `cp .env.example .env` and fill in DB credentials + a JWT secret.
2. `pnpm install`
3. Create the MySQL database (e.g. via phpMyAdmin or CLI): `CREATE DATABASE nonoclub;`
4. `pnpm db:migrate` — applies the schema.
5. `pnpm db:seed` — seeds roles, settings, protected ambassadors, and the two default users.
6. `pnpm dev` — opens at http://localhost:3000

### Default users

| Email | Password | Role |
|---|---|---|
| `johnny@nonoclub.local` | `password` | owner |
| `mok@nonoclub.local` | `password` | admin |

**Change both passwords immediately after first login** via the **Access** page.

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
```

## Tests

```bash
pnpm test:run   # one-shot
pnpm test       # watch mode
```

Coverage focuses on the load-bearing logic:

- `CommissionService` — §5.4 worked example end-to-end, draft/voided exclusion, frozen-rate snapshots
- `SaleService` — confirm/void state machine
- `PDFImportService.parsePdfBuffer` — parses the Mok April fixture, total matches header within 0.05
- `permissions` — owner-protection guard for admins
- `jwt` — sign/verify round-trip

## Commission rules

- Every confirmed sale (Table or BGO) earns the ambassador 8% by default. The 8% is per-ambassador and editable.
- Owner + admin users earn an additional 1% bonus of total monthly sales (Table + BGO, including their own).
- Both the per-ambassador rate and the bonus rate are tunable in **Settings**. Changes apply only to **future confirms** — already-confirmed sales keep their snapshotted rates.

## Roles

- `owner` (Johnny) — full access.
- `admin` (Mok) — full access except cannot edit, delete, or impersonate the owner, owner-linked ambassador, or any sales/payouts attributed to the owner. Cannot promote anyone (including themselves) to owner.
- `leader` — read access to all sales; views their own commission row only.
- `ambassador` — creates/edits their own draft sales; views their own commission row only.

## Project layout

```
NonoClub/
├── app/                  # frontend (SPA)
│   ├── pages/            # file-based routing
│   ├── components/       # ui/, layout/, sales/, payouts/
│   ├── composables/      # useAPI, useAPIMutation, useConfirm
│   ├── stores/           # auth.ts (Pinia)
│   ├── middleware/       # auth.ts, role.ts
│   ├── utils/            # currency, dateFormat
│   ├── config/           # sidebarNav
│   └── layouts/          # default
├── server/
│   ├── api/v1/           # REST endpoints
│   ├── services/         # business logic
│   ├── repositories/     # Drizzle queries
│   ├── db/               # schema, client, seeds
│   ├── middleware/       # auth (JWT)
│   └── utils/            # errors, jwt, password, permissions
├── drizzle/migrations/   # generated SQL
└── tests/                # Vitest unit tests + fixture PDF
```

## PDF import

Drop a Nono Club POS PDF onto **Sales → Import**. The parser:

- Extracts the per-row date, order ID, table number, and amount.
- Skips rows where the amount is `RM -` (cancelled tables).
- Detects duplicates by `external_order_id` and skips them on re-import.
- Always requires you to **manually pick the ambassador** to assign — the PDF's "PP" name is shown as a hint only.
- Imports as `draft` by default so you can review before confirming.
