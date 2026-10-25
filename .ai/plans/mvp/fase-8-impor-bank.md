# Fase 8: Impor Mutasi Bank

## Why
Quick-add mempercepat input, tetapi kalau user lupa mencatat seminggu,
transaksinya tetap harus diingat satu per satu. Mutasi bank sudah berisi semua
transaksi itu. Dengan impor mutasi, mengejar ketertinggalan cukup dengan
mencocokkan, bukan mengingat.

## What
Impor file mutasi dari bank yang dipakai user, dicocokkan dengan transaksi
yang sudah tercatat, lalu yang belum tercatat diberi saran kategori dan
disimpan sekaligus.

## Constraints
### Must
- Satu parser per format bank, semuanya menghasilkan bentuk yang sama
  (`tanggal, nominal, arah, keterangan, saldo?`)
- Parsing di server route, file tidak disimpan setelah selesai
- **Pencocokan**: mutasi dianggap sudah tercatat kalau ada transaksi di akun
  yang sama dengan nominal sama dan tanggal ±2 hari. Kasus ragu ditandai,
  tidak diputuskan otomatis
- Saran kategori memakai `suggest_from_note` dari fase 6
- Mutasi yang ternyata transfer antar-akun sendiri (mis. BCA → Gopay) dikenali
  dan disarankan sebagai transfer, bukan pengeluaran
- Memakai `import_batches` dan `dedupe_key` dari fase 5

### Must Not
- Meminta atau menyimpan kredensial internet banking. Hanya file yang diunduh
  user sendiri

### Out of Scope
- Sinkronisasi otomatis dengan bank (API open banking)
- Riwayat GoPay/ShopeePay yang tidak punya fitur ekspor (fase 11, lewat
  screenshot + AI)

## Current State
- Relevant files:
  - Belum ada contoh file. **Dibutuhkan dari user** sebelum fase dimulai:
    mutasi BCA (CSV dari KlikBCA/myBCA atau e-statement PDF), Jago, dan
    Seabank
- Existing patterns:
  - Alur preview → commit dari fase 5

## Tasks

### T1: Kumpulkan contoh dan tentukan format
**What:** Dari contoh file asli (disamarkan), catat format tiap bank: CSV/PDF,
kolom, format tanggal dan nominal, penanda debit/kredit.
**Files:** `.ai/specs/format-mutasi-bank.md`
**Verify:** Setiap bank yang didukung punya minimal satu file contoh di
`server/utils/bank/__fixtures__` (sudah disamarkan).

### T2: Parser per bank
**What:** `parseBca`, `parseJago`, `parseSeabank`, ... dengan deteksi format
otomatis. PDF dibaca dengan ekstraksi teks.
**Files:** `server/utils/bank/*.ts`, test per parser
**Verify:** Jumlah baris dan total debit/kredit hasil parsing sama dengan yang
tertera di file.

### T3: Pencocokan
**What:** `reconcile(statementRows, existingTransactions)` → tiap baris
berstatus `tercatat`, `baru`, `ragu`, atau `transfer`. Lalu saran kategori
untuk yang `baru`.
**Files:** `server/utils/reconcile.ts`, `server/utils/reconcile.test.ts`,
`server/api/import/bank/*`
**Verify:** Mutasi seminggu yang separuhnya sudah dicatat manual: separuh itu
ditandai `tercatat`, sisanya `baru`.

### T4: Layar pencocokan
**What:** Pilih akun → pilih file → daftar baris per status. Baris `baru`
bisa diterima dengan satu tap atau digeser untuk dilewati. Kategori bisa diubah
per baris atau sekaligus untuk beberapa baris. Tombol simpan semua.
**Files:** `app/pages/settings/import/bank.vue`, `app/features/import/*`
**Verify:** Mengejar 30 transaksi dari mutasi seminggu selesai dalam kurang dari
2 menit.

## Catatan Pelaksanaan

Dikerjakan di working tree yang sama dengan fase 9 (branch `fase-9-berbagi`).
Bank yang didukung: **SeaBank** (rekening koran PDF) dan **Jago** (riwayat
kantong PDF). BCA tidak didukung karena mutasi bulan berjalan tidak bisa
diunduh. Detail format di `.ai/specs/format-mutasi-bank.md`.

- **T1/T2 Parser**: `server/utils/bank/{pdf,seabank,jago,index}.ts`, PDF dibaca
  dengan `unpdf` (jalan di Workers). Fixture rekaan di
  `server/utils/bank/__fixtures__/statements.ts` meniru tata letak asli,
  termasuk baris Jago yang terbelah halaman. File asli: SeaBank 53 baris, total
  sama dengan ringkasan; Jago 37 baris, saldo berjalan bersambung.
- **T3 Pencocokan** `server/utils/reconcile.ts`: kandidat = akun sama, arah sama,
  nominal sama (transfer keluar boleh termasuk biaya), tanggal ±2 hari; satu
  transaksi hanya dipakai satu baris, kandidat terdekat (jam kalau ada) menang.
  Dua kandidat sama dekat di tanggal berbeda → `ragu`. Mutasi yang pernah
  diimpor dikenali dari `dedupe_key` (`bk:` + sha256 akun|tanggal|jam|arah|nominal|saldo).
  Transfer sendiri: pindah kantong (nama kantong → akun, termasuk "Jago - Nama
  Kantong"), nama pemilik rekening di keterangan, atau pihak lawan = nama akun
  dengan kata transfer/top up. Saran kategori dari `suggest_from_note` per
  catatan unik, hanya kalau jenisnya searah dengan mutasi.
- RPC `commit_bank_import` (batch `bank_statement`, transaksi `import_bank`,
  duplikat dilewati, viewer ditolak), tes di `supabase/tests/bank_import_test.sql`.
  Route `POST /api/import/bank/preview` (multipart, file hanya di memori) dan
  `POST /api/import/bank/commit` (JSON baris pilihan, divalidasi zod).
- **T4 Layar** `/settings/import/bank`: pilih akun (grid, diingat per buku) →
  pilih PDF → tab Baru/Transfer/Ragu/Tercatat per hari. Ketuk baris untuk
  kategori atau akun lawan transfer (sheet di HP, dialog di iPad/desktop),
  geser kiri atau "Lewati" untuk melewati, "Pilih" untuk mengubah kategori
  beberapa baris sekaligus. Ragu tidak ikut disimpan kecuali dipakai. Ringkasan
  menampilkan cek total terhadap file dan saldo akhir file vs aplikasi. Batal
  impor lewat Riwayat impor seperti fase 5. Tautan dari Lainnya dan halaman
  impor Realbyte.
- Dicek di browser (desktop dan 375 px) dengan PDF rekaan dari fixture:
  preview, saran kategori, pilih akun transfer, simpan 6 baris, unggah ulang →
  semua `tercatat`, geser untuk melewati. Data uji dihapus lagi.
