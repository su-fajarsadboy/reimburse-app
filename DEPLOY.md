# Deploy ke Vercel

State produksi sudah disiapkan otomatis untuk project Supabase `giituvhyufcfufpjbvxc`.

## 1. Status Supabase production (sudah dilakukan)

- ✅ Project linked ke `giituvhyufcfufpjbvxc.supabase.co`
- ✅ Migrasi `0001_init.sql` + `0002_storage.sql` ter-apply (8 tabel + bucket `receipts`)
- ✅ Admin user `admin@example.com` / `changeme123` ter-seed
- ✅ Tested via `npm run start` lokal pointed ke prod DB — login flow + API works

> ⚠️ **Ganti password admin segera** setelah deploy. Tidak ada UI ganti pwd di v1.
>
> SQL untuk update via Supabase Studio:
> ```sql
> UPDATE users
> SET password_hash = crypt('<password baru>', gen_salt('bf', 10))
> WHERE email = 'admin@example.com';
> ```
> Atau wipe + re-seed dengan env baru:
> ```sql
> DELETE FROM api_keys; DELETE FROM trips; DELETE FROM users;
> ```
> Lalu jalankan `npm run seed:admin` dengan `ADMIN_EMAIL` + `ADMIN_PASSWORD` baru.

## 2. Push ke Vercel

### A. Connect repo

```bash
# Sekali setup (pastikan sudah login)
npx vercel login
npx vercel link
```

Atau lewat Vercel dashboard → Import Git Repository → pilih repo ini.

### B. Set environment variables

Vercel → project → **Settings → Environment Variables** → tambahkan untuk scope **Production**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://giituvhyufcfufpjbvxc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_4JgtHlBoCnnlFkFimUrvIA_pRw6SE8H` |
| `SUPABASE_SERVICE_ROLE_KEY` | (dari Supabase dashboard → Settings → API → `service_role` reveal) |
| `NEXTAUTH_URL` | `https://<your-domain>.vercel.app` (atau custom domain) |
| `NEXTAUTH_SECRET` | `lvWnN2Mmy1EcG4Az2W56s3jXZCGqTLKzkl3GybgI+lo=` |
| `ADMIN_EMAIL` | `admin@example.com` (atau email kamu) |
| `ADMIN_PASSWORD` | `changeme123` (atau password kuat) |

> `ADMIN_EMAIL` + `ADMIN_PASSWORD` sebenarnya sudah dipakai untuk seed di Supabase. Vercel masih perlu mereka kalau-kalau ingin re-seed lewat one-shot script. Kalau yakin tidak akan re-seed, dua var ini bisa di-skip.

### C. Deploy

```bash
npx vercel --prod
```

atau push ke branch yang dikonfigurasi untuk production deploy (default `main`).

### D. Update `NEXTAUTH_URL` setelah dapat domain

Setelah deploy pertama, Vercel kasih URL final (mis. `reimburse-app-xxx.vercel.app` atau custom domain). Update env `NEXTAUTH_URL` ke URL itu, lalu **redeploy** (login flow butuh URL exact match).

## 3. Verifikasi production

1. Buka `https://<your-domain>/login`
2. Login dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. Buat trip → bagikan share link → buka di incognito → input transaksi
4. `/docs` → API reference render
5. `/api/v1/openapi.json` → 200 dengan spec

## 4. Optional: enable rate limiting (recommended untuk prod)

Bikin Redis di [upstash.com](https://upstash.com/) (free tier cukup), lalu tambah di Vercel env:

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Tanpa ini, `getRateLimiter()` jatuh ke `NoOpRateLimiter` (allow-all) — endpoint `/api/v1/*` tidak di-rate-limit.

## 5. Catatan known-issue

- **Vercel Hobby plan timeout 10s**: endpoint `GET /api/admin/trips/[id]/export.zip` memfetch + zip semua receipt — bisa kena timeout kalau trip > ~50 receipts. Upgrade ke Pro (60s) atau pindah export ke async (out of v1 scope).
- **Receipt photos** disimpan permanen di Supabase Storage — Free tier = 1 GB, no auto-cleanup.
- **Single admin** per instance. Untuk multi-admin, perlu fitur signup (out of v1).
- **Next 16 deprecation**: `middleware.ts` → `proxy.ts`. Build masih lewat dengan warning.
