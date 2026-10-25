# Fase 11: Fitur Lanjutan

## Why
Setelah fase 1-10, fitur Realbyte yang sering dipakai sudah ada. Fase ini
berisi sisa fitur Realbyte dan input dari foto. Foto struk atau screenshot
riwayat dibutuhkan untuk e-wallet yang tidak punya ekspor mutasi (GoPay,
ShopeePay).

## What
1. Foto struk/screenshot → draf transaksi lewat Claude API.
2. Kunci app dengan PIN.
3. Tagihan kartu kredit dan cicilan.

## Constraints
### Must
- Gambar dikirim ke server route, lalu server memanggil Claude API. API key
  hanya ada di secret Worker
- Model default **Claude Haiku 5.5** (cukup untuk struk dan murah, sekitar Rp5
  per foto). Model bisa diganti lewat env
- Pakai Anthropic SDK resmi (`@anthropic-ai/sdk`) dengan structured output
  (zod schema yang sama dengan form transaksi)
- Hasil AI selalu jadi **draf** yang ditinjau user, tidak langsung disimpan
- Gambar dikompres di client sebelum dikirim (pola
  `opnamix/src/lib/imageCompression.ts`) dan tidak disimpan setelah dibaca,
  kecuali user memilih melampirkannya
- Batas pemakaian per user per hari supaya biaya tidak lepas kendali

### Must Not
- Mengirim gambar ke AI tanpa tindakan eksplisit dari user

### Out of Scope
- Multi-mata uang (dicatat untuk nanti)

## Current State
- Relevant files:
  - Draf transaksi dan chip dari fase 6, pencocokan dari fase 8
- Existing patterns:
  - `opnamix/src/lib/imageCompression.ts`

## Tasks

### T1: Baca struk dan screenshot
**What:** `POST /api/ocr` → Claude API membaca gambar → daftar draf (satu
struk = satu transaksi, satu screenshot riwayat = banyak transaksi). Lalu
dicocokkan dengan transaksi yang sudah ada (fungsi `reconcile` fase 8) dan
diberi saran kategori.
**Files:** `server/api/ocr.post.ts`, `app/features/ocr/*`
**Verify:** Screenshot riwayat GoPay berisi 10 transaksi menghasilkan 10 draf
dengan nominal dan tanggal benar.

### T2: Kunci PIN
**What:** PIN 4-6 digit saat app dibuka atau kembali dari latar belakang lebih
dari N menit. PIN di-hash dan disimpan lokal. Lupa PIN = login OTP ulang.
**Files:** `app/features/lock/*`
**Verify:** App yang dibuka dari app switcher setelah 5 menit meminta PIN.

### T3: Kartu kredit
**What:** Akun jenis `card` dengan tanggal cetak tagihan dan jatuh tempo.
Tampilan tagihan per periode, dan pembayaran tagihan sebagai transfer.
**Files:** `app/features/accounts/*`
**Verify:** Transaksi setelah tanggal cetak masuk ke tagihan bulan berikutnya.

### T4: Cicilan
**What:** Pengeluaran yang dicicil N bulan menjadi aturan berulang
(fase 6 T5) dengan jumlah kali yang tetap.
**Files:** `app/features/recurring/*`
**Verify:** Cicilan 3 bulan Rp300.000 membuat 3 transaksi Rp100.000 lalu
berhenti.

## Catatan pelaksanaan

Dikerjakan di branch `fase-11-lanjutan` (dicabang dari `main` setelah fase 4–10
digabung).

- **T1 Baca foto**: `@anthropic-ai/sdk` + `client.messages.parse` dengan
  `zodOutputFormat` (`server/utils/ocr.ts`), model `claude-haiku-5-5` sesuai spec
  (ganti lewat `NUXT_OCR_MODEL`). Satu skema untuk struk (satu transaksi) dan
  screenshot riwayat (banyak baris); hasilnya divalidasi lagi (`toStatementRows`:
  tanggal salah/masa depan, nominal nol, jam tidak valid dibuang) lalu masuk
  alur pencocokan yang sama dengan mutasi bank (`server/utils/bankPreview.ts`,
  dipakai PDF dan foto; dedupe_key `ph:`). Kuota harian per user di database
  (`ai_usage`, `ai_take_quota`, `ai_refund_quota`; default 30, `NUXT_OCR_DAILY_LIMIT`),
  dikembalikan kalau panggilan AI gagal. Foto dikecilkan di HP
  (`app/lib/imageCompression.ts`, sisi terpanjang 1600 px, JPEG) dan baru
  dikirim setelah tombol **Baca dengan AI**; tidak disimpan. Simpan lewat
  `commit_bank_import` dengan `kind: 'photo'` (batch `photo`, transaksi `ocr`),
  jadi bisa dibatalkan dari Riwayat impor. Layar `/settings/import/photo` memakai
  komponen yang sama dengan impor mutasi (`StatementImport.vue`).
  **Belum dicoba dengan Claude sungguhan**: `NUXT_ANTHROPIC_API_KEY` belum diisi;
  tanpa kunci, route menjawab 503 dengan pesan yang jelas.
  Lampiran foto ke transaksi belum dibuat (opsional di spec).
- **T2 Kunci PIN**: hash PBKDF2-SHA256 (Web Crypto, 120.000 iterasi, garam acak)
  di `localStorage` per perangkat dan per user (`app/features/lock/*`). Terkunci
  saat app dibuka dan saat kembali dari latar belakang ≥ batas waktu (langsung,
  1, 5, 15 menit). Layar kunci keypad menutupi semua halaman (`app.vue`); 5 kali
  salah → hanya bisa masuk ulang dengan kode email; Lupa PIN = keluar + hapus PIN.
  Pengaturan di `/settings/lock`. Butuh HTTPS (Web Crypto); di alamat LAN http
  pengaturan menjelaskan hal itu.
- **T3 Kartu kredit**: kolom `statement_day`/`due_day` sudah ada sejak fase 2,
  kini diisi di form akun grup Kartu Kredit. `app/features/accounts/billing.ts`
  menghitung periode (transaksi setelah tanggal cetak masuk tagihan bulan
  berikutnya; tanggal 29–31 jatuh ke hari terakhir), utang saat cetak dihitung
  mundur dari saldo sekarang, pembayaran sejak cetak, sisa, dan status
  (lunas/belum/lewat jatuh tempo). Kartu tagihan di detail akun, tombol Bayar
  tagihan membuka transfer ke kartu dengan nominal sisa.
- **T4 Cicilan**: tanpa perubahan database. Mode **Cicilan** di form transaksi
  berulang (pengeluaran baru): total ÷ bulan, aturan bulanan dengan `end_on` di
  cicilan terakhir (`app/features/recurring/installment.ts`), sehingga
  `post_due_recurring` berhenti sendiri. Selisih pembulatan ditampilkan.
