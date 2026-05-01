# Camping Expense Tracker — Design Spec

**Date**: 2026-05-01
**Source PRD**: `Planning_PRD_Camping_Expense_Tracker_v3.docx` (v1.2, Mei 2026)
**Source Design**: `reimburse.zip` — interactive HTML/JSX prototype (v1.1 visual). Design dibuat dengan PRD v2; v3 menambahkan Agentic AI API.
**Status**: Approved by user, ready for implementation plan

---

## 0. Scope & Approach

Single Next.js 14+ App Router project mengimplementasikan PRD Camping Expense Tracker v1.2. Web app + REST API untuk integrasi agentic AI (mis. OpenCLAW). Target: 1 trip, 5 peserta, ~6-7 hari kerja oleh 1 developer.

**Stack final** (Approach A approved):
- Framework: Next.js (App Router)
- Styling: Tailwind + shadcn/ui
- DB: Supabase Postgres, akses via `@supabase/supabase-js` (PostgREST), service-role key di server-side
- Auth admin: NextAuth credentials provider
- Auth API: Bearer token (custom middleware, bcrypt hash di DB)
- Validation: Zod (shared web + API)
- Storage foto: Supabase Storage (bucket `receipts`, public-read)
- Rate limiting: Upstash Redis (production), NoOp fallback (dev)
- Hosting: Vercel (akhir); local-first dev pakai Supabase CLI
- Locale UI: Bahasa Indonesia (hardcoded, no i18n library)

**Keputusan resolusi PRD Open Questions §2.13:**
1. **Format reimburse**: CSV generik + ZIP foto.
2. **Retensi foto struk**: Tidak auto-delete di v1; TODO untuk cleanup job.
3. **OpenAPI doc**: Generate dari Zod schemas + halaman Scalar di `/docs`.
4. **API edit/delete**: Tetap POST + GET only (selaras dengan §1.3 non-goal).

**Keputusan ambiguitas implementasi:**
- Admin bootstrap: idempotent seed dari `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars.
- Share link: `/trip/[shareToken]` dengan `nanoid(16)`, no expiry waktu.
- Trip lifecycle: manual close oleh admin, closed → API key auto-revoked, share link read-only.
- Settlement persistensi: tidak ada "tandai sudah transfer" di DB. Design punya tombol "Tandai lunas" tapi sebagai client-side ephemeral state saja.
- Receipt upload web: client-side compress (browser-image-compression) + server-side fallback (sharp).
- Idempotency-Key missing untuk POST → 400 `IDEMPOTENCY_KEY_REQUIRED`.
- Receipt bucket public-read (URL langsung dari export ZIP/AI agent).
- Audit log dinaikkan dari Should Have ke baseline (PRD §2.7.10 menyebut sebagai security baseline).

**Scope expansion vs PRD (dari design):**
Design menambahkan fitur-fitur di atas PRD baseline. Spec ini mengikut design karena design lebih recent + concrete + intentional:

- **Approval Center** (scope expansion vs PRD §1.3 non-goal "Approval reimburse di dalam app"):
  Admin review tiap transaksi reimbursable: pending → approved (dengan adjust nominal opsional) atau rejected. Bulk approve. Field di `transactions`: `status`, `approved_amount`, `reviewed_by`, `reviewed_at`, `review_note`.
- **Trip extra fields**: `location`, `start_date`, `end_date` (PRD hanya `name`).
- **Participant color**: oklch string untuk avatar warna unik per peserta.
- **Transaction time field**: HH:MM (PRD hanya date).
- **Setup wizard**: stepped flow setelah login (Detail → Peserta → Bagikan Link).
- **Visual system**: Inter Tight + JetBrains Mono fonts, oklch palette, dark theme, atmosphere bg.
- **Layout**: Sidebar nav (desktop) + Bottom nav (mobile) + Topbar.
- **2-step new transaction modal**: step 1 (deskripsi/jumlah/kategori/foto) → step 2 (payer/split/reimburse/notes).

**Design-led tapi defer dari v1:**
- Export format Excel/PDF (design punya tab; v1 hanya CSV + ZIP).
- "Richness" presets (minimal/balanced/playful) — design tooling, bukan production feature.
- Atmosphere toggle — keep as default-on, tidak ada UI toggle di prod.

---

## 1. Project Structure

```
reimburse-app/
├─ app/
│  ├─ (admin)/                    # Admin pages, NextAuth gated
│  │  ├─ login/page.tsx
│  │  ├─ dashboard/page.tsx
│  │  ├─ dashboard/trip/new/page.tsx       # Setup wizard: Detail → Peserta → Bagikan Link
│  │  └─ dashboard/trip/[id]/
│  │     ├─ page.tsx              # Tab: Transaksi
│  │     ├─ approval/page.tsx     # Approval Center (design-led)
│  │     ├─ settlement/page.tsx
│  │     ├─ export/page.tsx
│  │     ├─ api-keys/page.tsx
│  │     ├─ audit-log/page.tsx
│  │     └─ setup/page.tsx        # Edit trip + peserta + share link
│  ├─ trip/[shareToken]/          # Public participant pages, no auth
│  │  ├─ page.tsx                 # Pick name + transactions list
│  │  ├─ new/page.tsx
│  │  ├─ edit/[txnId]/page.tsx
│  │  └─ settlement/page.tsx
│  ├─ docs/page.tsx               # Scalar API reference
│  ├─ api/
│  │  ├─ auth/[...nextauth]/route.ts
│  │  ├─ admin/                   # NextAuth-gated server endpoints
│  │  │  └─ trips/...
│  │  ├─ web/                     # Share-token-gated participant endpoints
│  │  │  └─ trip/[token]/...
│  │  ├─ upload/route.ts          # Web receipt upload (admin or peserta)
│  │  └─ v1/                      # AI agent API (Bearer-gated)
│  │     ├─ transactions/route.ts
│  │     ├─ receipts/route.ts
│  │     ├─ trips/me/route.ts
│  │     ├─ participants/route.ts
│  │     ├─ categories/route.ts
│  │     └─ openapi.json/route.ts
│  ├─ layout.tsx
│  └─ globals.css
├─ lib/
│  ├─ db/
│  │  ├─ client.ts                # Supabase client factory (service-role)
│  │  └─ types.ts                 # Generated via supabase gen types typescript
│  ├─ auth/
│  │  ├─ nextauth.ts              # NextAuth config (credentials provider)
│  │  └─ api-key.ts               # Bearer key verify + middleware helper
│  ├─ validation/
│  │  ├─ transaction.ts           # Zod schema (shared web + API)
│  │  ├─ trip.ts
│  │  ├─ participant.ts
│  │  └─ openapi.ts               # zod-to-openapi conversion
│  ├─ services/
│  │  ├─ transactions.ts          # Domain logic shared web + API
│  │  ├─ settlement.ts            # Pure greedy debt simplification
│  │  ├─ idempotency.ts           # Idempotency-Key check + store
│  │  ├─ rate-limit.ts            # Adapter pattern (Upstash/NoOp)
│  │  ├─ storage.ts               # uploadReceipt() shared
│  │  ├─ audit.ts                 # logRequest() helper
│  │  └─ export.ts                # CSV + ZIP generation
│  ├─ seed/
│  │  └─ admin.ts                 # Idempotent admin seed from env
│  ├─ errors.ts                   # ApiError class + withErrorBoundary
│  └─ utils.ts                    # nanoid wrappers, formatters, slugify
├─ components/
│  ├─ ui/                         # shadcn primitives (button, dialog, ...)
│  ├─ layout/
│  │  ├─ SidebarNav.tsx           # Desktop primary nav
│  │  ├─ BottomNav.tsx            # Mobile primary nav
│  │  ├─ Topbar.tsx               # Crumb + title + actions
│  │  └─ Atmosphere.tsx           # Background grid + glow
│  └─ trip/
│     ├─ TransactionForm.tsx      # Modal 2-step (deskripsi/jumlah/kategori/foto → payer/split/reimburse)
│     ├─ TransactionList.tsx      # Grouped by date
│     ├─ ParticipantPicker.tsx    # Avatar grid
│     ├─ Avatar.tsx               # Initials + oklch color from participant.color
│     ├─ ApprovalList.tsx         # Approval Center left list
│     ├─ ApprovalDetail.tsx       # Approval Center right detail (slider + presets + reject/approve)
│     ├─ ApprovalHero.tsx         # Hero stats card
│     ├─ SettlementLanes.tsx      # Money lanes (from→to cards)
│     ├─ BalanceBars.tsx          # Per-person balance bar chart
│     ├─ ApiKeyDialog.tsx
│     ├─ ShareLinkCard.tsx
│     └─ SetupWizard.tsx          # 3-step wizard
├─ supabase/
│  └─ migrations/
│     ├─ 0001_init.sql            # Tables + indexes
│     └─ 0002_storage.sql         # Bucket + policies
├─ tests/
│  ├─ unit/
│  │  ├─ settlement.test.ts
│  │  ├─ validation.test.ts
│  │  └─ idempotency.test.ts
│  ├─ integration/api/
│  │  ├─ transactions.test.ts
│  │  ├─ auth.test.ts
│  │  └─ rate-limit.test.ts
│  └─ e2e/
│     └─ golden-path.spec.ts
├─ middleware.ts                  # Rate limit + CORS for /api/v1/*
├─ .env.example
├─ next.config.mjs
├─ tailwind.config.ts
├─ tsconfig.json
├─ vitest.config.ts
├─ playwright.config.ts
└─ package.json
```

---

## 2. Data Model

6 tabel + 1 audit. Postgres via Supabase. Tidak ada RLS — akses lewat server pakai service-role key.

### `users`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
email         text UNIQUE NOT NULL
password_hash text NOT NULL                  -- bcrypt
created_at    timestamptz DEFAULT now()
```

### `trips`
```sql
id           text PRIMARY KEY DEFAULT ('trip_' || nanoid())
name         text NOT NULL
location     text                            -- design field (mis. "Camp Geulis Sentul")
start_date   date                            -- design field
end_date     date                            -- design field
share_token  text UNIQUE NOT NULL            -- nanoid(16)
created_by   uuid REFERENCES users(id)
status       text NOT NULL DEFAULT 'active'  -- 'active' | 'closed'
created_at   timestamptz DEFAULT now()
closed_at    timestamptz
```

### `participants`
```sql
id         text PRIMARY KEY DEFAULT ('part_' || nanoid())
trip_id    text REFERENCES trips(id) ON DELETE CASCADE
name       text NOT NULL
color      text                              -- oklch string for avatar (assigned by server, palette of 8)
created_at timestamptz DEFAULT now()
UNIQUE (trip_id, name)
```

### `transactions`
```sql
id              text PRIMARY KEY DEFAULT ('txn_' || nanoid())
trip_id         text REFERENCES trips(id) ON DELETE CASCADE
date            date NOT NULL
time            text                              -- HH:MM, design field, optional
description     text NOT NULL
amount          bigint NOT NULL                   -- IDR integer (yang diajukan)
category        text NOT NULL                     -- enum at app layer
payer_id        text REFERENCES participants(id)
is_reimbursable boolean NOT NULL DEFAULT false
receipt_url     text
notes           text
source          text NOT NULL DEFAULT 'manual'    -- 'manual' | 'openclaw' | ...

-- Approval fields (design-led, hanya meaningful kalau is_reimbursable=true)
status          text NOT NULL DEFAULT 'pending'   -- 'pending' | 'approved' | 'rejected'
approved_amount bigint                            -- NULL = full amount; nominal yang disetujui (≤ amount? boleh > amount juga per design)
reviewed_by     uuid REFERENCES users(id)
reviewed_at     timestamptz
review_note     text

created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
INDEX (trip_id, date DESC)
INDEX (trip_id, is_reimbursable, status) WHERE is_reimbursable = true
```

**Catatan approval fields:**
- Untuk transaksi `is_reimbursable = false`, status tetap default `'pending'` tapi tidak ditampilkan/dipakai. Approval Center filter `is_reimbursable = true`.
- `approved_amount = NULL` saat status `'pending'` atau `'rejected'`. Saat `'approved'`, NULL → pakai `amount`, atau eksplisit nominal yang adjusted (default-nya = amount kecuali admin adjust).
- Settlement (split bill antar peserta) **selalu pakai `amount` original**, bukan `approved_amount`. Approval hanya mempengaruhi laporan reimburse ke kantor.
- Export CSV/ZIP filter `is_reimbursable = true AND status = 'approved'`. Nominal di CSV pakai `COALESCE(approved_amount, amount)`.

### `transaction_participants` (M:N)
```sql
transaction_id text REFERENCES transactions(id) ON DELETE CASCADE
participant_id text REFERENCES participants(id)
PRIMARY KEY (transaction_id, participant_id)
```

### `api_keys`
```sql
id           text PRIMARY KEY DEFAULT ('key_' || nanoid())
trip_id      text REFERENCES trips(id) ON DELETE CASCADE
key_hash     text NOT NULL                  -- bcrypt of full key
key_prefix   text NOT NULL                  -- first 17 chars: "ctx_live_" + 8 random (for display + DB lookup narrowing)
label        text
last_used_at timestamptz
revoked_at   timestamptz
created_at   timestamptz DEFAULT now()
INDEX (trip_id) WHERE revoked_at IS NULL
```

### `idempotency_records`
```sql
key           text PRIMARY KEY               -- raw UUID from header
api_key_id    text REFERENCES api_keys(id)
request_hash  text NOT NULL                  -- sha256(canonicalized body)
response_json jsonb NOT NULL
status_code   smallint NOT NULL
created_at    timestamptz DEFAULT now()
INDEX (created_at)                            -- TTL cleanup target
```

### `audit_logs`
```sql
id          bigserial PRIMARY KEY
api_key_id  text REFERENCES api_keys(id)     -- NULL kalau invalid bearer
endpoint    text NOT NULL
method      text NOT NULL
status_code smallint NOT NULL
ip          inet
user_agent  text
created_at  timestamptz DEFAULT now()
INDEX (api_key_id, created_at DESC)
```

**Catatan ID format:** prefix-readable (`trip_`, `part_`, `txn_`, `key_`) sesuai contoh PRD §2.7.4. Pakai `nanoid` (URL-safe, 21-char default).

**Storage bucket:**
- Name: `receipts`
- Access: public-read
- Path convention: `<trip_id>/<nanoid>.jpg`
- Created via `supabase/migrations/0002_storage.sql`

---

## 3. Auth & Access Control

Tiga jalur akses berbeda, masing-masing dengan mekanisme dan trust boundary tersendiri.

### 3.1 Admin (NextAuth credentials)

**Bootstrap (idempotent):**
- Skrip `npm run seed:admin` (atau dipanggil saat dev startup) cek `users` table. Kalau kosong, baca `ADMIN_EMAIL` + `ADMIN_PASSWORD` env, hash bcrypt, insert. Kalau sudah ada row, no-op.
- Tidak ada UI signup. Tidak ada UI ganti password v1.

**Login flow:**
- `POST /api/auth/callback/credentials` (NextAuth) → email lookup → bcrypt verify → JWT cookie `next-auth.session-token` (HTTP-only, secure, SameSite=Lax), session 30 hari sliding.
- Middleware gating untuk `app/(admin)/**` dan `/api/admin/**`: kalau no session → redirect/401.

### 3.2 Peserta (no login, share link)

**Flow:**
1. `GET /trip/<share_token>` → server fetch trip. Kalau `status != 'active'` → halaman "Trip ditutup" (read-only).
2. Kalau aktif: dropdown nama peserta + tombol "Lanjut".
3. User pilih nama → simpan ke `localStorage` (key `trip:<shareToken>:participantId`) + JS-readable cookie `participant_id_<shareToken>` (SameSite=Strict).
4. localStorage/cookie hanya UX hint. **Server selalu trust `participant_id` dari request body** + validasi participant ∈ trip's participants.

**Authorization model:**
- Anyone with share link bisa input atas nama participant siapapun. **By design per PRD** (peserta tidak login).
- Edit/hapus oleh "payer": server check `transaction.payer_id == request.participant_id`. Tetap weak (no real auth) tapi cukup untuk niat baik 5 orang.
- Mitigasi: audit log + admin override.

### 3.3 AI Agent (Bearer API key)

**Generate key:**
- Admin di `/dashboard/trip/[id]/api-keys` → tombol "Generate Key" + label opsional.
- Server: `nanoid(32)` → plain key = `ctx_live_<32 chars>` → bcrypt hash → insert (key_hash, key_prefix=first 17 chars `ctx_live_<first 8 random>`, label, trip_id).
- Plain key ditampilkan **sekali** di dialog dengan copy button + warning. Setelah dialog ditutup, hilang.

**Verify (`/api/v1/*` middleware helper):**
1. Parse `Authorization: Bearer <key>`. Missing → 401 `INVALID_AUTH`.
2. Extract key_prefix → `SELECT * FROM api_keys WHERE key_prefix = ? AND revoked_at IS NULL`.
3. Bcrypt compare full key vs `key_hash`. Tidak match → 401.
4. Kalau `trips.status = 'closed'` → 403 `TRIP_CLOSED`.
5. Update `last_used_at` fire-and-forget (non-blocking).
6. Attach `apiKey` + `tripId` ke request context.

**Performance:** bcrypt verify ~100ms. Untuk 60 req/min cukup. Future optimization: in-memory LRU cache 1 menit TTL kalau jadi bottleneck.

**Revoke:**
- Set `revoked_at = now()`. Instant invalidation di next request.

**Trip close → API keys auto-revoke:**
- Admin tutup trip → transaction:
  ```sql
  UPDATE trips SET status='closed', closed_at=now() WHERE id=?;
  UPDATE api_keys SET revoked_at=now() WHERE trip_id=? AND revoked_at IS NULL;
  ```

---

## 4. API Design (`/api/v1/*`)

### 4.1 Middleware chain
```
request → CORS check → rate-limit → auth (Bearer) → idempotency check → handler → audit log → response
```

CORS + rate-limit di `middleware.ts` (Edge kalau bisa). Auth + idempotency + audit di per-route helper (Node runtime, butuh DB).

### 4.2 CORS
- `/api/v1/*`: `Access-Control-Allow-Origin` TIDAK di-set → browser block (server-to-server only).
- `OPTIONS` untuk `/api/v1/*` → 405.
- `/api/upload`: same-origin only.

### 4.3 Rate limiting
- 60 req/menit per `api_keys.id`.
- Adapter pattern di `lib/services/rate-limit.ts`:
  - `UpstashRateLimiter` (production): `@upstash/ratelimit` + `@upstash/redis`. Aktif kalau `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set.
  - `NoOpRateLimiter` (dev): skip + log warning sekali.
- Response 429: header `Retry-After: <seconds>` + body `{ success: false, error: { code: "RATE_LIMITED", ... } }`.

### 4.4 Idempotency

`withIdempotency(req, apiKeyId, handler)` di `lib/services/idempotency.ts`:

1. Read `Idempotency-Key` header. Missing untuk POST → 400 `IDEMPOTENCY_KEY_REQUIRED`.
2. Validate UUID v4. Invalid format → 400 `INVALID_IDEMPOTENCY_KEY`.
3. Compute `request_hash = sha256(canonicalize(body))`. Canonicalize = sort object keys recursively, JSON.stringify.
4. `SELECT * FROM idempotency_records WHERE key = ? AND api_key_id = ?`.
5. Match found:
   - Same `request_hash` → return cached `response_json` + `status_code`. Tambah header `Idempotent-Replay: true`.
   - Different `request_hash` → 409 `IDEMPOTENCY_KEY_REUSED`.
6. No match → run handler → INSERT response sebelum return (transaction-bound dengan business write).

**TTL**: 24 jam. Manual cleanup di v1 (rows tiny). TODO untuk cron.

### 4.5 Validation (Zod, shared)

`lib/validation/transaction.ts`:
```ts
export const TransactionInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),  // default = today di handler
  description: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  currency: z.literal('IDR').default('IDR'),
  category: z.enum(['transport', 'makan', 'logistik', 'sewa_alat', 'tiket', 'lain']),
  payer_id: z.string(),
  participant_ids: z.array(z.string()).min(1).max(5),
  is_reimbursable: z.boolean().default(false),
  receipt_url: z.string().url().optional(),
  notes: z.string().max(500).optional(),
  source: z.string().default('manual'),
});
```

Business validation pasca-Zod (di service layer):
- `payer_id` ∈ trip's participants
- `participant_ids` ⊆ trip's participants
- `payer_id` boleh ∈ `participant_ids` (payer ikut share)

### 4.6 Endpoint summary

| Method | Path | Tugas |
|--------|------|-------|
| `POST` | `/api/v1/transactions` | Validate → idempotency → insert + M2M → audit → 201 |
| `GET` | `/api/v1/transactions` | Pagination `?limit=50&cursor=<txn_id>`. Default 100, max 200. |
| `POST` | `/api/v1/receipts` | Multipart parse → validate → sharp compress → upload → return URL |
| `GET` | `/api/v1/trips/me` | Trip yang associated dengan API key |
| `GET` | `/api/v1/participants` | List `{id, name}[]` |
| `GET` | `/api/v1/categories` | Static enum list |
| `GET` | `/api/v1/openapi.json` | Generated dari Zod via `@asteasolutions/zod-to-openapi` |
| `GET` | `/docs` (page) | Scalar API reference |

### 4.7 Response envelope (selalu)
```ts
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fields?: Record<string, string> } }
```

### 4.8 Error codes

| Code | HTTP | Trigger |
|------|------|---------|
| `VALIDATION_ERROR` | 422 | Zod parse fail / business invariants |
| `INVALID_AUTH` | 401 | Missing/invalid bearer |
| `TRIP_CLOSED` | 403 | Key valid tapi trip closed |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Missing header pada POST |
| `INVALID_IDEMPOTENCY_KEY` | 400 | Bukan UUID v4 |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Sama key, body beda |
| `RATE_LIMITED` | 429 | >60/menit |
| `NOT_FOUND` | 404 | Resource/endpoint tidak ada |
| `INTERNAL_ERROR` | 500 | Bug server (no stack leak) |

---

## 5. Web UI Surfaces

Mobile-first per PRD §2.10. shadcn/ui + Tailwind. Bahasa Indonesia. Visual system mengikuti design files (`reimburse.zip`).

### 5.1 Visual system (dari design)

- **Fonts**: Inter Tight (400/500/600/700) untuk UI; JetBrains Mono (400/500) untuk angka, ID, kode.
- **Theme**: Dark theme default (no toggle di v1). PRD C2 (dark mode) jadi default; light mode defer.
- **Color palette**: oklch-based (variables di `globals.css`). Tones: `--bg-0..3`, `--text-1..4`, `--border`, `--primary`, `--warm` (untuk reimburse), `--success`, `--danger`. Per-category dot colors (transport/makan/logistik/sewa_alat/tiket/lain) → 6 oklch hues.
- **Atmosphere**: Background grid + glow di body (always on di prod, "richness" presets dari design = dev tooling, tidak ship).
- **Layout shell**:
  - Desktop (≥768px): `<SidebarNav>` kiri + `<main>` (Topbar + content)
  - Mobile (<768px): full-width `<main>` + `<BottomNav>` fixed bottom
- **Avatar**: initial huruf pertama nama + bg color dari `participants.color` (oklch palette dari server).

### 5.2 Admin pages (NextAuth gated)

- **`/login`**: form email + password (eye toggle, loading state). PRD admin only.
- **`/dashboard`**: list trips (cards) + tombol "Buat Trip Baru". Kalau cuma 1 trip aktif, redirect langsung ke trip page.
- **`/dashboard/trip/new`**: 3-step setup wizard
  - Step 1 — Detail Trip: nama, lokasi, tanggal mulai/selesai
  - Step 2 — Peserta: tambah/edit/hapus nama peserta (min 2, max 10), avatar color auto-assigned
  - Step 3 — Bagikan Link: tampilkan share URL + QR + tombol copy → "Lanjut ke Dashboard"
- **`/dashboard/trip/[id]`**: tab layout dengan sidebar primary nav
  - **Transaksi**: stats grid (Total Trip, Reimbursable, Per Orang) + filter pills (Semua / Hanya Reimbursable / 6 kategori) + search + list grouped by date dengan sub-total per hari
  - **Approval Center**: hero stats + bulk action bar + 2-col grid (filtered list left, detail panel right). Detail: receipt preview, amount adjuster (slider + presets 0/50/75/100%), reviewer note, approve/reject buttons
  - **Settlement**: stats + 2-col grid (Money Lanes left dengan from→to + tombol "Tandai lunas" client-side, Saldo Per Orang right dengan bar chart bipolar)
  - **Export**: format selector (v1: CSV only, Excel/PDF disabled tooltip "Coming soon"), filter checkboxes (reimbursable only / include foto), preview table + tombol "Export Sekarang"
  - **API Keys**: list + tombol Generate + Revoke + Audit-log link
  - **Audit Log**: timeline request via API key (timestamp, endpoint, status, IP, user-agent)
  - **Setup**: edit nama trip, peserta, lokasi, tanggal (sama komponen seperti wizard step 1+2 tapi non-stepped)
- **Header trip**: nama + status badge + share link card (copy + QR) + tombol "Tutup Trip" (modal konfirmasi)
- **`<NewTransactionModal>`** (overlay dari mana saja): 2-step
  - Step 1: deskripsi, jumlah, kategori (6 button grid), foto struk (kamera/file)
  - Step 2: payer (avatar grid), split with (checkbox list dengan share preview), reimbursable checkbox (warm-soft bg), notes
  - "Kembali" / "Simpan"

### 5.3 Peserta pages (no auth, share token)

- **`/trip/[shareToken]`**: 
  - Kalau trip closed → halaman "Trip ditutup" read-only (list + settlement view)
  - Kalau aktif + belum pilih nama → `<ParticipantEntry>` full-screen (card dengan list peserta + tombol "Masuk sebagai [Nama]")
  - Kalau sudah pilih → list transaksi + FAB "Catat" → `<NewTransactionModal>`
- **`/trip/[shareToken]/edit/[txnId]`**: edit transaksi (kalau payer match)
- **`/trip/[shareToken]/settlement`**: read-only settlement (sama UI seperti admin)
- **Tombol "Ganti nama"** di header peserta untuk reset localStorage + cookie.

### 5.4 Internal web endpoints (bukan `/api/v1/*`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/admin/trips` | NextAuth |
| PATCH | `/api/admin/trips/[id]` | NextAuth (edit nama/lokasi/tanggal) |
| POST | `/api/admin/trips/[id]/close` | NextAuth |
| POST | `/api/admin/trips/[id]/participants` | NextAuth |
| PATCH | `/api/admin/trips/[id]/participants/[pid]` | NextAuth |
| DELETE | `/api/admin/trips/[id]/participants/[pid]` | NextAuth (hanya kalau no transactions) |
| PATCH | `/api/admin/trips/[id]/transactions/[txnId]` | NextAuth (admin edit) |
| DELETE | `/api/admin/trips/[id]/transactions/[txnId]` | NextAuth (admin delete) |
| POST | `/api/admin/trips/[id]/transactions/[txnId]/approve` | NextAuth (status=approved + approved_amount + note) |
| POST | `/api/admin/trips/[id]/transactions/[txnId]/reject` | NextAuth (status=rejected + note) |
| POST | `/api/admin/trips/[id]/transactions/[txnId]/reset` | NextAuth (status=pending, clear approval fields) |
| POST | `/api/admin/trips/[id]/transactions/bulk-approve` | NextAuth (body: txn_ids[]) |
| POST | `/api/admin/trips/[id]/api-keys` | NextAuth |
| POST | `/api/admin/trips/[id]/api-keys/[keyId]/revoke` | NextAuth |
| GET | `/api/admin/trips/[id]/export.csv` | NextAuth |
| GET | `/api/admin/trips/[id]/export.zip` | NextAuth |
| POST | `/api/web/trip/[token]/transactions` | share_token + body participant_id |
| PATCH | `/api/web/trip/[token]/transactions/[txnId]` | share_token + payer_id check |
| DELETE | `/api/web/trip/[token]/transactions/[txnId]` | sama |
| POST | `/api/upload` | NextAuth ATAU `?token=<shareToken>` query param (validated server-side) |

**Catatan:**
- Editing transaction (admin atau payer) tidak boleh ubah `status`/`approved_amount`/`reviewed_*` — itu hanya via approval endpoints. Re-edit non-approval fields setelah approved → server reset status ke `pending` (audit-friendly), atau tolak edit kalau status != pending. **Pilihan saya: tolak edit transaction body kalau status != pending; admin harus reset dulu**. Lebih predictable.

### 5.5 Tidak di v1 (defer)
- Custom split tidak rata (PRD C1)
- Webhook outbound (PRD C3)
- Light mode (kebalikan: design dark-first; light mode defer)
- "Tandai sudah transfer" persistensi (client-side ephemeral toggle OK, tidak ke DB)
- Export Excel / PDF (CSV + ZIP saja di v1; UI button disabled)
- "Richness" presets (dev tooling, tidak ship)

---

## 6. Settlement Algorithm

Pure function di `lib/services/settlement.ts`. Greedy debt simplification (Splitwise-style). Semua integer IDR (no float).

### 6.1 Step 1 — Compute net balance per participant

Untuk tiap transaksi `t` dengan `amount = A`, `participants_count = N`:
- `share = floor(A / N)` untuk N-1 participants
- Sisa `A - share * (N-1)` di-assign ke 1 participant deterministik (sort by participant_id, ambil pertama)
- `payer` di-credit `A`
- Tiap participant di-debit `share` (atau `share + remainder` untuk yang dapat sisa)

```
balance[p] = sum(amount where payer == p) - sum(share where p ∈ participants)
```

### 6.2 Step 2 — Greedy match
```
creditors = sorted_desc(balance > 0)
debtors   = sorted_asc(balance < 0)
transfers = []

while creditors and debtors:
  c = creditors[0]
  d = debtors[0]
  amount = min(c.balance, -d.balance)
  transfers.push({ from: d.id, to: c.id, amount })
  c.balance -= amount
  d.balance += amount
  if c.balance == 0: pop creditors
  if d.balance == 0: pop debtors
```

Output ≤ N-1 transfer (optimal greedy untuk N participants).

### 6.3 Signature
```ts
export function computeSettlement(
  participants: { id: string; name: string }[],
  transactions: { amount: number; payer_id: string; participant_ids: string[] }[]
): Transfer[]

type Transfer = { from_participant_id: string; to_participant_id: string; amount: number };
```

Pure function — caller fetch DB, pass in. Server-side computed di route handler.

### 6.4 Edge cases
1. Trip kosong → `[]`
2. Single payer pays all + tidak share → 1 creditor + N-1 debtor
3. Saldo persis 0 untuk semua → `[]`
4. Participant tidak ikut transaksi apapun → tidak muncul di output

### 6.5 Settlement vs Approval (interaksi antar fitur)

Settlement (split bill antar peserta) **selalu pakai `transactions.amount`** (yang diajukan), bukan `approved_amount`. Alasan:
- Settlement = uang yang sudah keluar dari kantong masing-masing saat trip. Tidak berubah karena keputusan reimburse kantor.
- Approval Center = subset (filter `is_reimbursable = true`) dengan output yang berbeda (laporan reimburse, pakai `COALESCE(approved_amount, amount)`).

UI Settlement tidak menampilkan informasi approval. Pisah konsep, hindari kebingungan.

---

## 7. File Upload Pipeline

Dua jalur masuk → pipeline server yang sama.

### 7.1 Web (peserta/admin)
```
[<input capture="environment">] → [browser-image-compression: 1920px max, q=0.8, ≤500KB]
  → [POST /api/upload multipart]
  → [server validate auth (NextAuth ATAU share_token)]
  → [server validate file: MIME, size]
  → [sharp re-compress fallback]
  → [Supabase Storage upload: receipts/<trip_id>/<nanoid>.jpg]
  → [return { receipt_url }]
  → [client: store URL in form state, show thumbnail]
```

### 7.2 AI Agent (`POST /api/v1/receipts`)
```
[multipart upload + Bearer]
  → [middleware: rate-limit + auth]
  → [server validate file]
  → [sharp compress]
  → [Supabase Storage upload]
  → [return { success, data: { receipt_url, expires_at: null } }]
```

### 7.3 Shared module `lib/services/storage.ts`
```ts
export async function uploadReceipt(file: File | Blob, tripId: string): Promise<{ url: string }>
```
- Validate MIME ∈ `{image/jpeg, image/png, image/webp}`
- Validate size ≤ 5MB pre-compress
- `sharp().resize(1920, null, { withoutEnlargement: true }).jpeg({ quality: 80 })`
- `supabase.storage.from('receipts').upload(...)` dengan path `<tripId>/<nanoid>.jpg`
- Return public URL
- Throw `UploadError` dengan code (`INVALID_MIME`, `TOO_LARGE`, `STORAGE_ERROR`)

### 7.4 Export ZIP
- Stream pakai `archiver`. Filter `is_reimbursable = true` + `receipt_url IS NOT NULL`.
- Naming dalam ZIP: `<YYYY-MM-DD>_<description-slug>_<txn_id_short>.<ext>`.
- Untuk ~30-50 receipt, sync streaming OK (no background job).

### 7.5 Export CSV
- Filter `is_reimbursable = true`.
- Columns: `tanggal, deskripsi, kategori, nominal, payer, reimbursable, receipt_url, notes`.
- `csv-stringify` + UTF-8 BOM (Excel-friendly).

---

## 8. Error Handling

### 8.1 Server side
- Setiap route dibungkus `withErrorBoundary(handler)`:
  - `ZodError` → 422 dengan `error.fields` map
  - `ApiError` (custom) → status + code + message
  - Unknown → log full + return 500 `INTERNAL_ERROR` (no stack leak)
- **Tidak ada silent fallback**: kalau Storage upload gagal, response error eksplisit.
- Audit log entry dicatat juga untuk error responses.
- Failed bearer verify dicatat dengan `api_key_id = NULL` untuk forensic.

### 8.2 Client side
- Form submit error → toast Bahasa Indonesia (`"Gagal menyimpan: <message>"`); form data tidak hilang.
- Tidak ada optimistic UI di v1 (tunggu server confirm sebelum update list).
- Network vs validation dibedakan: network → "Periksa koneksi", validation → highlight field.

---

## 9. Testing Strategy

3 layer, fokus correctness-critical.

### 9.1 Unit tests (`vitest`) — `tests/unit/`
- `settlement.test.ts`: empty, single payer, equal split, pecahan IDR, multi-creditor multi-debtor optimal count, participant tidak ikut
- `validation.test.ts`: Zod boundaries (amount 0, negative, participant_ids cross-trip simulation, length limits)
- `idempotency.test.ts`: request_hash canonicalization (key order tidak ngaruh), UUID v4 validation

### 9.2 Integration tests (`vitest` + Supabase local) — `tests/integration/api/`
- `transactions.test.ts`:
  - POST happy path (201 + DB row)
  - POST tanpa Bearer (401)
  - POST dengan key revoked (401)
  - POST dengan trip closed (403)
  - POST tanpa Idempotency-Key (400 `IDEMPOTENCY_KEY_REQUIRED`)
  - POST Idempotency-Key invalid format (400)
  - POST replay key + body sama → cached response, same id, header `Idempotent-Replay: true`
  - POST replay key sama body beda → 409
  - POST validation gagal (422 dengan fields)
  - POST `payer_id` bukan participant trip (422)
  - GET pagination
- `auth.test.ts`: bearer verify lifecycle + audit log entry
- `rate-limit.test.ts`: counter logic via mock store
- `approval.test.ts`:
  - Approve happy path (status → approved, approved_amount, reviewed_by/at)
  - Approve dengan adjusted amount (approved_amount ≠ amount)
  - Reject (status → rejected, approved_amount = 0 atau NULL)
  - Reset (clear all approval fields, status → pending)
  - Bulk approve (multiple txn_ids, hanya yang `is_reimbursable=true && status=pending`)
  - Approval pada transaksi `is_reimbursable=false` → 422 (tidak masuk akal)
  - Edit transaction body saat status≠pending → 409 (harus reset dulu)
  - Export CSV filter `is_reimbursable=true && status=approved`, nominal `COALESCE(approved_amount, amount)`

### 9.3 E2E (`Playwright`) — `tests/e2e/golden-path.spec.ts`
Single happy path:
1. Admin login
2. Buat trip + 5 peserta
3. Buka share link sebagai peserta → pilih nama → input transaksi (foto stub URL)
4. Generate API key → POST transaksi via `fetch`
5. Buka settlement → verify transfer count + amounts
6. Tutup trip → verify share link tampilkan "closed"

### 9.4 Tidak di-test eksplisit (defer)
- UI styling/visual regression
- Mobile viewport variations (manual review)
- Performance / load test
- A11y audit (manual review at end)

### 9.5 CI
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:integration` (start Supabase CLI dulu)
- `npm run test:e2e` (start Next dev + Supabase, run Playwright)

GitHub Actions opsional di v1; minimal local-runnable.

---

## 10. Non-Functional Requirements (per PRD §2.10)

- Mobile-first (95% pemakaian dari HP)
- Load halaman utama < 2 detik di 3G
- Foto struk auto-compress di client < 500KB
- API response < 500ms p95 untuk POST `/transactions`
- API uptime target 99% (best-effort, Vercel free tier)

---

## 11. Success Metrics (per PRD §2.11)

- 100% pengeluaran kelompok tercatat
- Input 1 transaksi via UI ≤ 60 detik
- Input 1 transaksi via AI agent ≤ 15 detik
- ≥ 30% transaksi masuk via API
- Settlement selesai < 1 hari setelah trip
- Zero duplikat transaksi (idempotency)

---

## 12. Out of Scope (v1, eksplisit)

Dari PRD §1.3 + diskusi (catatan: scope expansion vs PRD ada di Section 0):
- OCR struk di server (delegasi ke AI agent eksternal)
- Integrasi e-wallet/payment
- Multi-trip arsip riwayat panjang (schema mendukung, UI tidak)
- Multi-currency (hanya IDR)
- API agent DELETE/UPDATE bulk (`/api/v1/*` POST + GET only; admin web pakai `/api/admin/*` dengan PATCH)
- Custom split tidak rata (C1)
- Webhook outbound (C3)
- Light mode (defer; design dark-first)
- "Tandai sudah transfer" persistensi DB (client-side ephemeral toggle saja)
- Export Excel / PDF (CSV + ZIP saja)
- UI signup admin / change password
- Auto-cleanup foto struk
- OpenAPI publik publishing eksternal (cukup `/docs` di app)
- "Richness" presets (dev tooling)

**Approval reimburse**: PRD §1.3 menyatakan ini non-goal, **tapi design files menambahkannya** dan spec ini ikut design (lihat Section 0).

---

## 13. Risiko & Mitigasi (per PRD §2.12)

| Risiko | Mitigasi |
|--------|----------|
| Sinyal lemah di lokasi | Foto dulu, input belakangan |
| Peserta lupa input | Reminder admin (out of app) |
| AI halusinasi | Zod ketat, audit log, admin override |
| API key bocor | Revoke instan, audit log forensik |
| AI retry duplikat | Idempotency-Key wajib + cache 24h |
| Scope creep | Pegang MoSCoW di spec ini |
| bcrypt verify hot path | Future LRU cache 1m TTL kalau >60 req/min jadi bottleneck |
| Vercel cold start | Acceptable untuk 5-user usecase; tidak optimize di v1 |

---

## 14. Open Items untuk Implementation Plan

Hal-hal kecil yang akan di-finalize saat plan/coding:
- Struktur exact dari `seed:admin` (script vs Next instrumentation hook)
- Konfigurasi Supabase CLI exact untuk test integration (ephemeral DB per run vs shared)
- shadcn components yang perlu di-install (Button, Input, Dialog, Tabs, Select, Toast, Card, Table, Sheet, Slider, Checkbox, Tooltip, ...)
- Format slug untuk filename ZIP (depan-belakang transliterate Bahasa Indonesia)
- Palette 8 oklch untuk auto-assigned participant colors (deterministic mapping per trip dari hash nama)
- CSS variables exact dari design files yang di-port ke Tailwind config (`--bg-0..3`, `--text-1..4`, `--warm`, dll)

---

## 15. Design Asset Reference

Source design files ada di `reimburse.zip` (tidak di-commit ke repo). Saat implementasi:

- **`styles.css`** + **`approval.css`** — port CSS variables, animations, dan class-based design tokens ke Tailwind theme atau global CSS layer
- **`screens-*.jsx`** — referensi struktur komponen + interaksi (jangan copy literal — porting React UMD ke Next.js Server/Client Components, ganti `React.useState` jadi `import { useState }`)
- **`components.jsx`** — reusable bits: `Avatar`, `Topbar`, `SidebarNav`, `BottomNav`
- **`icons.jsx`** — icon set (lucide-react alternative). Pertimbangkan ganti dengan `lucide-react` (tree-shakeable) kalau iconnya tersedia.
- **`data.jsx`** — seed/sample data + reference `computeSettlement()` algoritma (sudah selaras dengan Section 6 spec ini)
- **`tweaks-panel.jsx`** — dev tooling, **jangan ship ke production**

Catatan: design pakai React 18 UMD + Babel standalone (browser-side compile). Implementasi production pakai Next.js build pipeline normal.
