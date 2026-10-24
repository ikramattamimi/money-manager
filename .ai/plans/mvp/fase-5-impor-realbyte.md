# Fase 5: Impor Realbyte dan Ekspor Excel

## Why
Data keuangan user selama 2 tahun ada di Realbyte, dan versi iOS-nya tidak
punya fitur impor. Tanpa impor, app baru mulai dari nol dan tidak bisa
menggantikan Realbyte. Impor juga menyediakan riwayat yang dibutuhkan saran
kategori di fase 6.

## What
1. Alur impor xlsx ekspor Realbyte: unggah → preview → konfirmasi → simpan
   sebagai satu batch yang bisa dibatalkan.
2. Ekspor transaksi ke Excel dengan rentang tanggal pilihan.

## Constraints
### Must
- Parsing di server route Nuxt (`/api/import/realbyte`), bukan di client,
  supaya file besar tidak memberatkan HP. Validasi baris dengan zod
- Batas ukuran file dan jumlah baris, tolak file yang bukan format Realbyte
  dengan pesan yang jelas
- **Transfer digabung**: pasangan `Transfer-Out` + `Transfer-In` jadi 1
  transaksi `transfer`
- **Tidak dobel**: `dedupe_key` = hash (tanggal-jam, nominal, jenis, akun,
  akun tujuan, note). Impor file yang sama dua kali tidak menambah apa pun
- Semua baris satu impor disimpan dalam satu RPC (berhasil semua atau tidak
  sama sekali), dengan `import_batch_id`
- Layar preview menampilkan: jumlah transaksi per jenis, akun baru, kategori
  baru, duplikat yang dilewati, dan baris yang gagal beserta alasannya

### Must Not
- Menyimpan file yang diunggah setelah impor selesai
- Membuat akun atau kategori baru tanpa ditampilkan di preview dulu

### Out of Scope
- Mutasi bank (fase 8)
- Impor dari app lain selain Realbyte

## Current State
- Relevant files:
  - Contoh: `C:\Users\Administrator\Downloads\2026-10-24.xlsx`
  - Acuan ekspor: `opnamix/src/features/reports` (pakai `xlsx`)
- Existing patterns:
  - Hasil pengecekan file contoh (24 Okt 2026): 3.007 baris, 25 Agu 2024 – 10 Okt
    2026, 43 akun, semua IDR. 440 `Transfer-Out` dan 440 `Transfer-In`,
    semuanya cocok satu-satu (tanggal + nominal + akun dibalik). Kolom
    `Period` berupa serial Excel yang menyimpan **tanggal dan jam**

## Pemetaan kolom

| Realbyte | Ke schema |
|---|---|
| `Period` | `occurred_at` (serial Excel → `Asia/Jakarta`) |
| `Accounts` (kolom ke-2) | `account_id` (akun sumber) |
| `Category` / `Subcategory` | `category_id`. Emoji dipisah dari nama, spasi di ujung dibuang. Untuk transfer, `Category` berisi akun lawan |
| `Note` / `Description` | `note` / `description` |
| `IDR` / `Amount` | `amount` |
| `Income/Expense`: `Exp.` / `Income` | `expense` / `income` |
| `Transfer-Out` + `Transfer-In` | 1 `transfer` (`account_id` = asal, `to_account_id` = tujuan) |
| `Income Balance` / `Expense Balance`, atau kategori `Modified Bal.` | `is_adjustment = true` |
| `Currency`, kolom `Accounts` terakhir | Diabaikan (semua IDR, kolom terakhir = nominal) |

Grup akun tidak ada di ekspor, jadi ditebak dulu: `Cash*` → cash,
`BCA`/`Jago - *`/`Seabank`/`BBCA` → bank, `Gopay*`/`Dana`/`Spay` → e-wallet,
`Bibit - *`/`RDN Stockbit` → investment, `spotify *` dan nama orang → receivable.
Semua tebakan bisa diubah di preview.

## Tasks

### T1: Parser Realbyte
**What:** Fungsi murni `parseRealbyte(rows) → { transactions, accounts,
categories, errors }` termasuk penggabungan transfer dan pemecahan emoji.
**Files:** `server/utils/realbyte.ts`, `server/utils/realbyte.test.ts`
**Verify:** Unit test dengan potongan file contoh (disamarkan): 440 transfer
tergabung, 0 baris yatim. Total pengeluaran per bulan sama dengan angka di
Realbyte.

### T2: Server route preview
**What:** `POST /api/import/realbyte/preview` menerima file, mencocokkan nama
akun dan kategori dengan yang sudah ada di buku (tidak peka huruf besar/kecil),
menghitung duplikat, lalu mengembalikan ringkasan preview.
**Files:** `server/api/import/realbyte/preview.post.ts`
**Verify:** File contoh menghasilkan 2.567 transaksi (3.007 − 440 baris
`Transfer-In` yang digabung).

### T3: RPC simpan impor
**What:** `commit_import(book_id, payload jsonb)`: buat `import_batches`, akun
dan kategori baru, lalu semua transaksi, dalam satu transaksi database.
Duplikat dilewati lewat `on conflict (book_id, dedupe_key) do nothing`.
**Files:** migration baru, `server/api/import/realbyte/commit.post.ts`
**Verify:** Impor file contoh dua kali: impor kedua menambah 0 transaksi.

### T4: Layar impor
**What:** Pengaturan → Impor: pilih file (bisa dari app Files di iPhone),
layar preview (ringkasan, tabel akun dengan grup yang bisa diubah, kategori
baru, baris gagal), tombol konfirmasi, progres, dan hasil.
**Files:** `app/pages/settings/import/*`, `app/features/import/*`
**Verify:** Seluruh alur bisa dijalankan dari iPhone dengan file dari app
Files.

### T5: Saldo awal setelah impor
**What:** Ekspor Realbyte tidak berisi saldo awal. Setelah impor, tampilkan
daftar akun dengan saldo hasil hitungan, dan minta user mengisi saldo
sebenarnya hari ini. App membuat transaksi koreksi (`is_adjustment`) untuk
yang berbeda.
**Files:** `app/pages/settings/import/balances.vue`
**Verify:** Setelah diisi, saldo semua akun sama dengan saldo di Realbyte.

### T6: Riwayat dan pembatalan impor
**What:** Daftar `import_batches`. Tombol "Batalkan impor" (dengan dialog,
karena tidak bisa di-undo) menghapus semua transaksi di batch itu.
**Files:** `app/pages/settings/import/history.vue`, RPC `revert_import`
**Verify:** Setelah dibatalkan, saldo akun kembali seperti sebelum impor.

### T7: Ekspor Excel
**What:** Ekspor transaksi untuk rentang tanggal tertentu ke `.xlsx`, dengan
kolom yang mirip ekspor Realbyte, supaya bisa dibuka di Excel atau diimpor
balik.
**Files:** `app/features/export/*`
**Verify:** File hasil ekspor bisa diimpor lagi ke buku kosong, dan totalnya
sama.
