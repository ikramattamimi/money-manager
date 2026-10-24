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
  - Layar statistik dari prototipe fase 3 T5 (`CompositionBar`, `Meter`, grafik 6 bulan)
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
**What:** Pilih periode (minggu, bulan, tahun, rentang), `CompositionBar` per
kategori dengan legenda persentase dan nominal (seperti prototipe), grafik
masuk/keluar 6 bulan. Tap kategori → rincian subkategori dan tren 6 bulan →
daftar transaksinya. Di iPad dan desktop, kartu tampil 2 kolom.
**Files:** `app/pages/stats/*`
**Verify:** Ganti bulan memperbarui angka tanpa layar berkedip. Tampilan sama
dengan layar Statistik di `design/prototype.html` di keempat ukuran.

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

## Catatan pelaksanaan

Dikerjakan di branch `fase-7-statistik` (dicabang dari `fase-6-input-cepat`).

- **RPC** (migration `stats_rpc`, tes `supabase/tests/stats_test.sql`):
  `category_breakdown`, `monthly_trend` (bulan kosong tetap muncul, opsional per
  kategori + subkategori), `budget_status`, `search_transactions` (ILIKE +
  word similarity di catatan/keterangan, total jumlah/masuk/keluar semua hasil).
  `month_summary` di spec = `months_overview` dari fase 4.
- **Cek dengan data Realbyte**: total pengeluaran Okt 2026 Rp2.131.754 sama
  dengan file; cari `shopee` = 116 transaksi, keluar Rp9.788.959, sama dengan
  query manual.
- **Periode**: minggu (mulai Senin), bulan, tahun, rentang; `period.ts` + tes.
- **Grafik**: batang tren memakai `transform: scaleY` dengan `--ease-spring`;
  reduced motion = transisi opacity. Komposisi tetap tampil (redup) saat periode
  baru dimuat (`keepPreviousData`), tanpa berkedip. Tabel tersembunyi untuk
  pembaca layar.
- **Budget**: berlaku sejak `start_on` sampai ada baris lebih baru; mengubah
  nominal = baris baru mulai bulan yang dilihat. Carry over hanya membawa sisa
  **satu bulan sebelumnya** (tidak menumpuk). Hapus = semua bulan (dua kali tap).
- Kunci query statistik/budget/pencarian ada di bawah `['transactions']`,
  jadi ikut dimuat ulang setiap transaksi berubah.
- Belum dicoba: membuat budget sungguhan dari UI di iPhone (logika sudah dites
  di SQL).
