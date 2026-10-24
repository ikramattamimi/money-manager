# Fase 7: Statistik, Budget, Pencarian

## Why
Tab Statistik dan budget adalah alasan orang mencatat keuangan: melihat uang
pergi ke mana dan menahan diri sebelum kebablasan. Ini fitur Realbyte yang
belum ada setelah fase 4.

## What
1. Statistik pengeluaran/pemasukan per kategori dan tren per bulan.
2. Budget bulanan per kategori dengan progres.
3. Pencarian dan filter transaksi.

## Constraints
### Must
- Agregasi di database (RPC), bukan di client
- Koreksi saldo (`is_adjustment`) dan transfer tidak dihitung di statistik
- Grafik mengikuti token warna fase 3, terbaca di mode terang dan gelap,
  dan punya alternatif teks (tabel/daftar) untuk pembaca layar
- Transisi grafik saat ganti bulan memakai spring, cross-fade kalau reduced
  motion

### Must Not
- Memakai library grafik berat yang memperbesar bundle secara signifikan

### Out of Scope
- Laporan PDF
- Statistik aset bersih dari waktu ke waktu (bisa ditambahkan nanti)

## Current State
- Relevant files:
  - Kerangka layar statistik dari prototipe fase 3 T6
- Existing patterns:
  - RPC `month_summary` dari fase 4 T5

## Tasks

### T1: RPC statistik
**What:** `category_breakdown(book_id, from, to, type)` (per kategori induk,
dengan rincian subkategori) dan `monthly_trend(book_id, months, type,
category_id?)`.
**Files:** migration baru, `app/features/stats/api.ts`
**Verify:** Total breakdown = total pengeluaran bulan itu di tab Transaksi.

### T2: Layar statistik
**What:** Pilih periode (minggu, bulan, tahun, rentang), donut chart per
kategori, daftar kategori dengan persentase dan nominal. Tap kategori →
rincian subkategori dan tren 6 bulan → daftar transaksinya.
**Files:** `app/pages/stats/*`
**Verify:** Ganti bulan dengan swipe, grafik beranimasi mulus dari nilai lama
ke nilai baru.

### T3: Budget
**What:** Budget total dan per kategori per bulan. Progres batang dengan warna
sesuai sisa (aman, hampir habis, lewat). Ringkasan budget di atas tab
Statistik. Opsi sisa budget dibawa ke bulan berikutnya.
**Files:** `app/features/budgets/*`, `app/pages/stats/budget.vue`
**Verify:** Budget Food Rp1.500.000 dengan pengeluaran Rp1.200.000 tampil
80% dan sisa Rp300.000.

### T4: Pencarian & filter
**What:** Cari teks di note dan description (trigram), filter jenis, akun,
kategori, rentang tanggal, dan rentang nominal. Hasil menampilkan total.
**Files:** `app/pages/search.vue`, `app/features/transactions/*`
**Verify:** Cari `shopee` di semua waktu menampilkan jumlah dan total yang
sama dengan query SQL manual.
