# Money Manager

PWA pencatat keuangan pengganti Realbyte Money Manager, dibuat untuk iPhone
(juga iPad dan desktop). Fokusnya dua keluhan utama Realbyte: input manual yang
lambat, dan tidak ada impor di iOS.

**Fitur utama**

- Transaksi harian, kalender, bulanan, tahunan; akun, kategori 2 level, transfer
- Catat cepat dari teks bebas ("kopi 25rb gopay"), template, transaksi berulang,
  cicilan, Shortcut iOS
- Impor ekspor Realbyte (.xlsx), mutasi bank PDF (SeaBank, Jago), dan foto
  struk/screenshot riwayat e-wallet (dibaca Claude)
- Statistik per kategori, tren 6 bulan, ringkasan insight, budget bulanan
- Tanggal awal bulan per buku (mis. gajian tanggal 25), kaitan reimburse/utang
- Buku bersama dengan undangan dan peran (pemilik, editor, hanya lihat)
- Kartu kredit dengan tagihan per periode, kunci PIN, profil

## Teknologi

| Lapisan | Pilihan                                                                             |
| ------- | ----------------------------------------------------------------------------------- |
| App     | Nuxt 4 (SPA, `ssr: false`) + TypeScript, Tailwind 4, shadcn-vue, TanStack Vue Query |
| Server  | Nitro server route (`server/api`), preset `cloudflare_module`                       |
| Data    | Supabase: Postgres + RLS per buku, Auth (OTP email), Storage, pg_cron               |
| AI      | Anthropic SDK (`@anthropic-ai/sdk`), default `claude-haiku-5-5`                     |
| Deploy  | Cloudflare Workers (aset statis + server route dalam satu Worker)                   |

Rencana per fase ada di [`.ai/plans/mvp`](.ai/plans/mvp/README.md), pedoman desain
di [`.ai/conventions/design.md`](.ai/conventions/design.md).

## Struktur

```
app/            Halaman, komponen, fitur (features/*: api.ts → use*.ts → komponen)
server/         Server route Nitro (impor, baca foto, email undangan) dan utilitasnya
shared/         Tipe yang dipakai app dan server
supabase/       Migration SQL, tes SQL, template email OTP
design/         Prototipe HTML acuan desain
.ai/            Rencana fase, spesifikasi format, konvensi
```

## Menjalankan di lokal

Butuh **Node 22+** dan **pnpm 10** (`corepack enable`).

```bash
pnpm install
cp .env.example .env   # lalu isi nilai Supabase
pnpm dev
```

App jalan di `http://localhost:3000`. Untuk mencoba dari HP di jaringan yang
sama, buka `http://<IP-komputer>:3000` (izinkan port 3000 di firewall). Catatan:
kunci PIN dan beberapa API browser butuh HTTPS, jadi hanya jalan di `localhost`
atau domain HTTPS.

Perintah lain:

| Perintah                    | Fungsi                                                     |
| --------------------------- | ---------------------------------------------------------- |
| `pnpm test`                 | Unit test (Vitest)                                         |
| `pnpm typecheck`            | Pemeriksaan tipe                                           |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                          |
| `pnpm build`                | Build produksi ke `.output/`                               |
| `pnpm run deploy`           | Build lalu deploy ke Cloudflare Workers                    |
| `pnpm db:types`             | Buat ulang `app/lib/database.types.ts` dari skema Supabase |

## Variabel lingkungan

| Nama                            | Wajib | Kapan dibaca     | Keterangan                                                         |
| ------------------------------- | ----- | ---------------- | ------------------------------------------------------------------ |
| `NUXT_PUBLIC_SUPABASE_URL`      | ya    | **saat build**   | URL project Supabase                                               |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | ya    | **saat build**   | Publishable/anon key (aman di browser, data dilindungi RLS)        |
| `NUXT_ANTHROPIC_API_KEY`        | tidak | runtime (secret) | Baca foto struk. Kosong = fitur nonaktif dengan pesan yang jelas   |
| `NUXT_OCR_MODEL`                | tidak | runtime          | Default `claude-haiku-5-5`                                         |
| `NUXT_OCR_DAILY_LIMIT`          | tidak | runtime          | Batas foto per user per hari, default `30`                         |
| `NUXT_RESEND_API_KEY`           | tidak | runtime (secret) | Kirim email undangan buku. Kosong = link undangan dibagikan manual |
| `NUXT_MAIL_FROM`                | tidak | runtime          | Pengirim email undangan; domainnya harus terverifikasi di Resend   |

Variabel `NUXT_PUBLIC_*` ditanam ke bundle saat `nuxt build`, jadi harus ada di
lingkungan **build** (file `.env` di mesin yang menjalankan build, atau variabel
build di Workers Builds). Sisanya dibaca server route saat berjalan.

## Setup Supabase

1. Buat project di [supabase.com](https://supabase.com) (region terdekat, mis.
   Singapura). Salin **Project URL** dan **publishable key** ke `.env`.
2. Terapkan migration (membuat tabel, RLS, RPC, bucket Storage `avatars`, dan
   jadwal pg_cron transaksi berulang setiap 07.00 WIB):

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

3. **Authentication → Sign In / Providers → Email**: aktifkan Email dan set
   **Email OTP Length = 8** (harus sama dengan `OTP_LENGTH` di
   `app/features/auth/api.ts`). Login memakai kode OTP, tanpa kata sandi.
4. **Authentication → Emails → Templates → Magic Link**: tempel isi
   `supabase/templates/otp.html` supaya email berisi kode, bukan tautan.
5. **Authentication → URL Configuration**: Site URL = domain produksi (mis.
   `https://money.contoh.com`), tambahkan juga `http://localhost:3000` ke
   Redirect URLs untuk development.
6. (Opsional) Kalau skema berubah: `pnpm db:types` untuk memperbarui tipe.

Tes SQL ada di `supabase/tests/*.sql`. Jalankan di SQL Editor (sebagai
postgres); setiap file membuat data uji di dalam transaksi lalu `rollback`, dan
selesai dengan baris `SEMUA TEST LOLOS`.

## Deploy ke Cloudflare Workers

App dan server route berjalan dalam satu Worker (`wrangler.jsonc`): `.output/public`
sebagai aset statis, `.output/server/index.mjs` sebagai Worker.

### Cara 1: dari komputer

1. Login sekali:

   ```bash
   npx wrangler login
   ```

2. Pastikan `.env` berisi `NUXT_PUBLIC_SUPABASE_URL` dan
   `NUXT_PUBLIC_SUPABASE_ANON_KEY` (dibaca saat build).
3. Build dan deploy:

   ```bash
   pnpm run deploy
   ```

   Hasilnya Worker `money-manager` di `https://money-manager.<akun>.workers.dev`.

4. Isi secret (sekali, atau saat berganti kunci). Nilai diminta interaktif dan
   tidak pernah masuk repo:

   ```bash
   npx wrangler secret put NUXT_ANTHROPIC_API_KEY
   npx wrangler secret put NUXT_RESEND_API_KEY
   ```

5. Variabel non-rahasia (opsional) diisi di dashboard: **Workers & Pages →
   money-manager → Settings → Variables and Secrets** (`NUXT_OCR_MODEL`,
   `NUXT_OCR_DAILY_LIMIT`, `NUXT_MAIL_FROM`), atau tambahkan blok `"vars"` di
   `wrangler.jsonc`.

### Cara 2: otomatis dari GitHub (Workers Builds)

1. Push repo ke GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Import a repository**,
   pilih repo ini.
3. Pengaturan build:
   - Build command: `pnpm run build`
   - Deploy command: `npx wrangler deploy`
   - **Build variables**: `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY`
4. Setelah deploy pertama, isi secret dan variabel runtime seperti langkah 4–5 di
   atas (Settings → Variables and Secrets).
5. Setiap push ke branch produksi (`main`) akan build dan deploy ulang.

### Setelah deploy

- **Domain sendiri**: Worker → Settings → **Domains & Routes → Add → Custom
  domain** (domainnya harus ada di Cloudflare). HTTPS otomatis.
- **Supabase Auth**: ganti Site URL dan Redirect URLs ke domain produksi
  (langkah 5 di Setup Supabase), kalau tidak, email login mengarah ke alamat lama.
- **Log**: `npx wrangler tail` atau tab Observability di dashboard Worker.
- **iPhone**: buka domain di Safari → Bagikan → **Tambah ke Layar Utama**, lalu
  buka dari ikon (mode standalone). Shortcut Siri ada di Lainnya → Shortcut iPhone.

### Catatan

- `compatibility_flags: ["nodejs_compat"]` dibutuhkan oleh beberapa dependensi
  server (pembaca PDF, xlsx).
- File yang diunggah (xlsx, PDF, foto) hanya dibaca di memori Worker selama
  permintaan dan tidak disimpan. Foto profil disimpan di Supabase Storage.
- Biaya baca foto ditanggung akun Anthropic pemilik kunci; batasi dengan
  `NUXT_OCR_DAILY_LIMIT` dan spend limit di Claude Console.
