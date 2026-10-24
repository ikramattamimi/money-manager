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
- Riwayat GoPay/ShopeePay yang tidak punya fitur ekspor (fase 10, lewat
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
