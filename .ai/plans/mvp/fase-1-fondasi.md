# Fase 1: Fondasi Project

## Why
Folder `money-manager` masih kosong. Semua fase berikutnya butuh project Nuxt
yang sudah punya tooling, struktur folder, koneksi Supabase, dan jalur deploy.
Kalau deploy baru disiapkan di akhir, masalah khas PWA iPhone (safe area,
mode standalone, cache service worker) baru ketahuan terlambat.

## What
Project Nuxt 4 yang bisa di-install ke home screen iPhone, ter-deploy ke
Cloudflare, dan punya pagar keamanan (typecheck, lint, test) sejak commit
pertama.

## Constraints
### Must
- Nuxt 4, TypeScript `strict`, pnpm
- `ssr: false` (SPA). App wajib login, jadi tidak butuh SEO. Server route
  Nitro tetap jalan untuk impor dan AI
- Struktur fitur seperti `opnamix`: `app/features/<domain>/{api.ts,keys.ts,use*.ts}`
- Supabase client hanya boleh diimpor dari `features/*/api.ts`
  (konvensi `opnamix/.ai/conventions/data-fetching.md`)
- PWA: `display: standalone`, ikon, `apple-touch-icon`, `viewport-fit=cover`,
  warna status bar mengikuti tema
- Env Supabase dibaca saat build, tidak di-commit

### Must Not
- Menyimpan secret (service role key, API key AI) di bundle client
- Memakai Nuxt UI (bertabrakan dengan shadcn-vue)

### Out of Scope
- Desain komponen (fase 3)
- Schema database (fase 2)

## Current State
- Relevant files:
  - Belum ada kode. Hanya `docs/` dan `.ai/`
  - Acuan konfigurasi: `opnamix/eslint.config.js`, `.prettierrc`,
    `vitest.config.ts`, `wrangler.jsonc`
  - Acuan Nuxt: `porto/portfolio-bootstrap5/nuxt.config.ts`
- Existing patterns:
  - `opnamix`: `src/lib/supabaseClient.ts`, `src/lib/format.ts` (format rupiah)
  - `porto`: deploy aset statis ke Workers (`wrangler.jsonc`)

## Tasks

### T1: Inisialisasi Nuxt
**What:** `pnpm create nuxt` (Nuxt 4, folder `app/`), aktifkan TypeScript
`strict`, set `ssr: false`, `app.head` dengan `lang="id"`,
`viewport-fit=cover`, dan meta `apple-mobile-web-app-*`. Tambahkan Tailwind
dan alias `@/`.
**Files:** `package.json`, `nuxt.config.ts`, `tsconfig.json`, `app/app.vue`
**Verify:** `pnpm dev` membuka halaman kosong. `pnpm build` sukses.

### T2: Tooling
**What:** ESLint (`@nuxt/eslint`), Prettier (konfigurasi sama dengan
`opnamix`), Vitest, script `typecheck`, `lint`, `format`, `test`. CI GitHub
Actions menjalankan keempatnya.
**Files:** `eslint.config.mjs`, `.prettierrc`, `vitest.config.ts`,
`.github/workflows/ci.yml`
**Verify:** CI hijau. Satu test contoh (`formatRupiah`) lolos.

### T3: shadcn-vue + Vue Query
**What:** Pasang shadcn-vue (`components.json`, folder `app/components/ui`),
TanStack Vue Query sebagai plugin Nuxt, dan `@lucide/vue` untuk ikon (`lucide-vue-next` sudah deprecated).
**Files:** `components.json`, `app/plugins/vue-query.ts`, `app/lib/utils.ts`
**Verify:** Komponen `Button` dari shadcn-vue tampil di halaman uji.

### T4: Koneksi Supabase
**What:** Client Supabase di `app/lib/supabase.ts` dari
`runtimeConfig.public`. Script `db:types` untuk generate tipe ke
`app/lib/database.types.ts`.
**Files:** `app/lib/supabase.ts`, `.env.example`, `package.json`
**Verify:** Halaman uji bisa memanggil `supabase.auth.getSession()` tanpa
error.

### T5: PWA
**What:** `@vite-pwa/nuxt` dengan manifest (nama, ikon 192/512, maskable,
`apple-touch-icon` 180), strategi cache `NetworkFirst` untuk HTML dan
`StaleWhileRevalidate` untuk aset. Prompt update saat ada versi baru.
**Files:** `nuxt.config.ts`, `public/icons/*`
**Verify:** Di iPhone: Add to Home Screen → app terbuka tanpa bar Safari, ikon
benar, konten tidak tertutup notch atau home indicator.

### T6: Deploy Cloudflare
**What:** Preset Nitro `cloudflare_module`, `wrangler.jsonc`, script
`deploy`. Env Supabase di pengaturan build Workers.
**Files:** `wrangler.jsonc`, `nuxt.config.ts`, `package.json`
**Verify:** URL `*.workers.dev` terbuka di iPhone dan bisa di-install. Satu
server route uji (`/api/health`) membalas `200`.
