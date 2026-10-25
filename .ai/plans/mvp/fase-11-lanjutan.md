# Fase 10: Fitur Lanjutan

## Why
Setelah fase 1-9, fitur Realbyte yang sering dipakai sudah ada. Fase ini
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
