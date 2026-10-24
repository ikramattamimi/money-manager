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
  - Layar prototipe `app/pages/prototype/*` (fase 3 T6) dijadikan dasar
- Existing patterns:
  - `opnamix/src/lib/format.ts` untuk format angka

## Tasks

### T1: Akun dan grup akun
**What:** Daftar akun per grup dengan saldo dan total aset/utang/bersih
(seperti tab Akun di Realbyte). Tambah, edit, arsipkan, dan urutkan dengan
drag (spring + rubber-band dari fase 3). Opsi "sertakan di total".
**Files:** `app/features/accounts/*`, `app/pages/accounts/*`
**Verify:** Total aset = jumlah saldo akun yang `include_in_total`. Mengarsipkan
akun menyembunyikannya tanpa menghapus transaksinya.

### T2: Kategori
**What:** Kategori pemasukan dan pengeluaran, 2 level, dengan emoji. Tambah,
edit, arsipkan, urutkan, pindah subkategori ke induk lain.
**Files:** `app/features/categories/*`, `app/pages/settings/categories.vue`
**Verify:** Kategori yang diarsipkan tidak muncul di pilihan, tetapi transaksi
lamanya tetap menampilkan nama kategorinya.

### T3: Form transaksi
**What:** Sheet tambah/edit transaksi: segmented control jenis, keypad nominal,
tanggal & jam (default sekarang), akun, kategori, note, description. Untuk
transfer: akun tujuan dan biaya. Tombol "Simpan" dan "Simpan & tambah lagi".
Ingat akun dan kategori terakhir per jenis transaksi.
**Files:** `app/features/transactions/*`,
`app/components/money/TransactionSheet.vue`
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
**Files:** `app/pages/accounts/[id].vue`
**Verify:** Saldo berjalan di baris terakhir = saldo akun saat ini.
