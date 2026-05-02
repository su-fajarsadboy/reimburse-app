# Reimburse · Camping Expense Tracker

Web app + REST API untuk catat pengeluaran trip kelompok, hitung settlement Splitwise-style, dan kelola approval reimburse ke kantor. API-nya bisa dipakai agentic AI (mis. OpenCLAW) untuk POST transaksi otomatis.

## Stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + Storage) · NextAuth (admin) · Bearer + bcrypt (API key) · Zod v4 · Tailwind v4 + shadcn/ui · Vitest + Playwright.

## Quick start (local)

Prereq: Node 20+, Docker Desktop running.

```bash
cp .env.example .env.local
# Edit ADMIN_EMAIL + ADMIN_PASSWORD if you want non-default credentials.
# Update NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY with the
# values printed by `supabase status` (sb_publishable_* / sb_secret_*).

npm install
npm run db:start          # Supabase local stack via Docker
npm run db:reset          # Apply migrations
npm run db:types          # Generate TypeScript types
npm run seed:admin        # Idempotent admin user from env
npm run dev               # http://localhost:3000
```

Login at `/login` with the credentials from `.env.local`. The app redirects to `/dashboard`.

## Testing

```bash
npm run test:unit          # Pure unit tests (settlement, idempotency, rate-limit)
npm run test:integration   # API + DB integration (requires npm run db:start)
npm run test:e2e           # Playwright golden path (requires dev server + admin seeded)
```

## Architecture

- `app/` — Next.js App Router (admin pages, peserta share-token pages, `/api/admin`, `/api/web`, `/api/v1`, `/api/upload`, `/docs`).
- `lib/services/` — pure-ish business logic (settlement, idempotency, rate-limit, storage, api-key, audit, transactions, trips, export).
- `lib/auth/` — NextAuth admin guard, share-token guard, Bearer-key guard.
- `lib/validation/` — Zod schemas + OpenAPI registration.
- `lib/db/` — Supabase client factory + generated types.
- `supabase/migrations/` — versioned SQL migrations.
- `tests/unit`, `tests/integration`, `tests/e2e` — Vitest + Playwright.

See `docs/superpowers/specs/2026-05-01-camping-expense-tracker-design.md` for the full design.

## API for AI agents

See `/docs` page (Scalar reference UI) or `GET /api/v1/openapi.json` for the OpenAPI 3.1 spec.

Quick example:

```bash
curl -X POST https://<your-app>/api/v1/transactions \
  -H "Authorization: Bearer ctx_live_..." \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Bensin",
    "amount": 100000,
    "category": "transport",
    "payer_id": "part_...",
    "participant_ids": ["part_...", "part_..."]
  }'
```

Endpoints:
- `POST /api/v1/transactions` — create txn (Idempotency-Key header required).
- `GET /api/v1/transactions` — list with cursor pagination.
- `POST /api/v1/receipts` — multipart upload, returns receipt_url.
- `GET /api/v1/trips/me` — info trip terkait API key.
- `GET /api/v1/participants` — peserta trip.
- `GET /api/v1/categories` — kategori valid.

All `/api/v1/*` endpoints: Bearer auth, audit-logged, rate-limited (NoOp default; Upstash if `UPSTASH_REDIS_REST_*` set), CORS-blocked in browser.

## Deployment (Vercel + hosted Supabase)

1. Create a Supabase project at supabase.com.
2. Push migrations: `npx supabase link --project-ref <ref> && npx supabase db push`.
3. Set env vars in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` — project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` — secret (server-side only)
   - `NEXTAUTH_URL` — production URL
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `ADMIN_EMAIL` + `ADMIN_PASSWORD`
   - Optional: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for rate limiting
4. `vercel --prod`.
5. Run admin seed once: `npm run seed:admin` (locally pointed at production env, or via a one-shot Vercel cron).

## Limitations (v1)

- Single admin per instance (no signup UI; seed via env).
- No multi-currency, OCR, e-wallet integration.
- Approval Center is built into v1 even though the original PRD listed it as out-of-scope; the design spec opted to include it.
- Export = CSV + ZIP only (Excel/PDF deferred).
- Rate limit defaults to NoOp without Upstash credentials.
- Receipt photos retained indefinitely (no auto-cleanup job).
