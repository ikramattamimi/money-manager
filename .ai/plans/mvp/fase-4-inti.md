# Fase 4: Fitur Inti

## Why
Ini fitur Realbyte yang dipakai setiap hari: mencatat transaksi, melihat
riwayat per hari/kalender/bulan, dan mengecek saldo akun. Tanpa ini app belum
bisa menggantikan Realbyte sama sekali.

## What
Akun, grup akun, kategori, transaksi (pemasukan, pengeluaran, transfer + biaya,
koreksi saldo), dan empat tampilan: harian, kalender, bulanan, serta daftar
akun dengan total aset.

## Constraints
### Must
- Lapisan data `komponen → use*.ts → api.ts → supabase`
  (`opnamix/.ai/conventions/data-fetching.md`), query key per domain di
  `keys.ts`
- Simpan transaksi dengan optimistic update: baris langsung muncul, saldo
  langsung berubah, lalu dibatalkan dengan toast kalau server menolak
- Semua UI memakai komponen dan token fase 3, dan lolos checklist
  `.ai/conventions/design.md`
- Viewer (fase 2) melihat semua layar tanpa tombol tambah, edit, dan hapus
- Bulan dan rentang tanggal dihitung di zona `Asia/Jakarta`
- Hapus pakai undo (toast), bukan dialog konfirmasi

### Must Not
- Menghitung saldo di client dari seluruh transaksi. Pakai view
  `account_balances` dan agregasi di database
- Memuat semua transaksi sekaligus. Per bulan, dengan pagination kalau perlu

### Out of Scope
- Statistik dan budget (fase 7)
- Template dan transaksi berulang (fase 6)

## Current State
- Relevant files:
  - Schema dari fase 2, komponen dari fase 3
  - Layar prototipe `app/pages/prototype/*` (fase 3 T5) dan `design/prototype.html` dijadikan dasar
- Existing patterns:
  - `opnamix/src/lib/format.ts` untuk format angka

## Tasks

### T1: Akun dan grup akun
**What:** Daftar akun per grup dengan saldo dan total aset/utang/bersih
(seperti tab Akun di Realbyte). Tambah, edit, arsipkan, dan urutkan dengan
drag (`useSwipe` dari fase 3). Opsi "sertakan di total".
**Files:** `app/features/accounts/*`, `app/pages/accounts/*`
**Verify:** Total aset = jumlah saldo akun yang `include_in_total`. Mengarsipkan
akun menyembunyikannya tanpa menghapus transaksinya.

### T2: Kategori
**What:** Kategori pemasukan dan pengeluaran, 2 level, dengan emoji. Tambah,
edit, arsipkan, urutkan, pindah subkategori ke induk lain.
**Files:** `app/features/categories/*`, `app/pages/settings/categories/*`
**Verify:** Kategori yang diarsipkan tidak muncul di pilihan, tetapi transaksi
lamanya tetap menampilkan nama kategorinya.

### T3: Form transaksi
**What:** Sambungkan `QuickAddPanel` fase 3 (dialog di iPad, kartu inline di
layar lebar) ke Supabase, lalu tambahkan form lengkap untuk tambah/edit:
tanggal & jam (default sekarang), akun, kategori, note, description. Untuk
transfer: akun tujuan dan biaya. Tombol "Simpan" dan "Simpan & lagi". Ingat
akun dan kategori terakhir per jenis transaksi. Tap baris transaksi membuka
form edit.

Di HP form adalah **halaman penuh** `/transaction`, bukan modal: tombol +
dan tap baris membuka halaman ini, dengan kolom "Ketik saja" di atas untuk
transaksi baru. Di iPad dan desktop form tampil sebagai dialog. Kategori dan
akun dipilih lewat grid gaya Realbyte (`GridPicker`): 3 kolom, kategori utama
membuka subkategori di bawah barisnya, grup akun membuka akunnya; setelah
memilih kategori, grid akun langsung muncul kalau akun belum diisi.
**Files:** `app/features/transactions/*`,
`app/components/money/QuickAddPanel.vue`,
`app/components/money/TransactionForm.vue`, `app/pages/transaction.vue`,
`app/components/data/GridPicker.vue`
**Verify:** Transfer Rp100.000 dengan biaya Rp2.500 dari BCA ke Gopay: BCA
berkurang Rp102.500, Gopay bertambah Rp100.000. Tidak bisa transfer ke akun
yang sama.

### T4: Koreksi saldo
**What:** Di detail akun, tombol "Sesuaikan saldo": isi saldo sebenarnya → app
membuat transaksi `is_adjustment` sebesar selisihnya.
**Files:** `app/features/accounts/*`
**Verify:** Saldo jadi sama dengan angka yang diisi. Koreksi tidak muncul di
statistik pengeluaran.

### T5: Tampilan harian, kalender, bulanan
**What:** Tab Transaksi dengan pemilih bulan yang bisa di-swipe dan tiga
sub-tampilan:
- **Harian:** dikelompokkan per tanggal, subtotal masuk/keluar per hari
- **Kalender:** grid bulan dengan total per tanggal, tap tanggal membuka
  daftar hari itu
- **Bulanan:** ringkasan per bulan dalam setahun

Ringkasan pemasukan, pengeluaran, dan selisih bulan ini di atas.
**Files:** `app/pages/index.vue`, `app/features/transactions/*`,
RPC `month_summary` di migration baru
**Verify:** Angka ringkasan sama dengan hasil query SQL manual untuk bulan
yang sama. Swipe bulan terasa langsung (data bulan sebelah di-prefetch).

### T6: Detail akun
**What:** Halaman akun: saldo, daftar transaksi akun itu (termasuk transfer
masuk/keluar), dan saldo berjalan.
**Files:** `app/pages/accounts/[id]/index.vue`
**Verify:** Saldo berjalan di baris terakhir = saldo akun saat ini.

## Catatan pelaksanaan

Dikerjakan di branch `fase-4-inti`. Perbedaan dari rencana:

- **Kategori pakai ikon + warna, bukan emoji.** Kolom baru `categories.icon`
  (nama ikon lucide, kebab-case) dan `categories.tone` (`neutral`, `r1`–`r6`)
  di migration `category_icon_tone` dan `category_sub_tone`. Supaya sama
  dengan bahasa visual fase 3 (`ToneIcon`). Subkategori ikut warna induknya.
  Daftar ikon ada di `app/features/categories/icons.ts`.
- **RPC:** `months_overview(book, year)` menggantikan `month_summary`, sekalian
  untuk tampilan Bulanan. Ditambah `account_ledger` (saldo berjalan, T6) dan
  `adjust_balance` (T4). Semua `SECURITY INVOKER`, jadi RLS tetap berlaku. Tes
  ada di `supabase/tests/ledger_test.sql`.
- **Semua form di HP jadi halaman penuh**, bukan sheet (permintaan setelah uji
  di iPhone). Kerangka `FormPage` + `useFormPage()`; rute `/transaction`,
  `/accounts/new`, `/accounts/[id]/edit`, `/accounts/[id]/adjust`,
  `/settings/categories/new`, `/settings/categories/[id]`. Tombol + di HP
  membuka `/transaction` (dengan "Ketik saja"), bukan sheet catat cepat. Aturan
  lengkapnya di `.ai/conventions/design.md` bagian Form.
- **Form edit di iPad/desktop** tampil sebagai dialog tengah (`Overlay`), bukan
  panel kanan. Panel kanan di layar lebar tetap untuk catat cepat.
- **Pilihan kategori dan akun** pakai grid gaya Realbyte (`GridPicker`), bukan
  `<select>`.
- **Validasi form** ditulis manual (cukup untuk beberapa field), tanpa
  vee-validate/zod.
- **Buku aktif** = buku pertama milik user, atau buku pertama yang bisa
  diakses. Pindah buku menyusul di fase 9.
- **Batas data:** transaksi per bulan dimuat sampai 1000 baris; detail akun
  menampilkan 200 transaksi terakhir. Pagination menyusul kalau dibutuhkan.
- **Urutkan** (akun dan kategori) memakai `SortableList` dengan pegangan drag
  dan Alt+panah untuk keyboard, dengan optimistic update.
- **Statistik** baru berupa komposisi per kategori utama untuk bulan aktif.
  Selebihnya di fase 7.
- Halaman **Lainnya** berisi buku aktif, tautan Akun dan Kategori, tema, dan
  keluar.
