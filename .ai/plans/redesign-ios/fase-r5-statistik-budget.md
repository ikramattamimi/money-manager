# Fase R5: Statistik dan Budget

## Why
Statistik dan budget sudah berfungsi, tapi tampilannya kartu web dan budget
hanya di satu layar. Mockup memisahkan Statistik / Budget / Catatan, dan budget
punya alur atur → rincian → nominal dengan kalkulator seperti Realbyte.

## What
Halaman `/stats` dan turunannya sesuai layar `stats`, `stats-budget`,
`budget-setting`, `budget-sub`, `budget-detail`, `budget-amount`,
`budget-category`, `stats-note`, `stats-category`.

## Constraints
### Must
- Bar atas: `MonthNav` + pil periode (lembar **Periode statistik** dengan 4
  pilihan yang sudah jalan: Mingguan, Bulanan, Tahunan, Periode/rentang);
  `SubTabs` Statistik · Budget · Catatan; geser = pindah periode.
- **Statistik**: tombol Pemasukan/Pengeluaran berisi total, donat 230px dengan
  persen, daftar kategori dengan bulatan persen berwarna → rincian kategori.
- **Rincian kategori**: batang 6 bulan + garis rata-rata putus-putus, kolom bisa
  diketuk untuk pindah bulan, sub-kategori, daftar transaksi per hari.
- **Budget**: kartu "Sisa (bulanan)" + "Atur budget", baris per kategori (ikon,
  nama, budget, bar persen, terpakai, sisa), merah bila lewat, baris Lainnya
  untuk kategori tanpa budget. Pemasukan: keadaan kosong.
- **Atur budget**: daftar kategori dengan pratinjau sub, bisa dibuka; ketuk →
  **rincian budget** (strip Budget/Terpakai/Sisa, garis budget + batang
  terpakai per bulan, transaksi) → pensil → **Budget per bulan** (tahun ‹ ›,
  Budget default, 12 bulan, bulan berjalan disorot) → **Isi nominal** halaman
  penuh dengan papan angka R4.
- Budget per bulan memakai model `budgets.start_on` yang ada: nilai tiap bulan =
  budget yang berlaku. Mengubah satu bulan berlaku mulai bulan itu. Override
  satu bulan saja ada di catatan fitur.
- **Catatan**: segmented urut Nama/Jumlah/Nominal, daftar pengeluaran per
  catatan (toko/tempat) dengan jumlah transaksi.
- Kartu insight (`InsightCard`) dan tampilan tahunan yang sudah ada tetap,
  digambar ulang sebagai grup iOS di Statistik.
- Grafik mengikuti skill `dataviz`; warna irisan dari nada kategori, terang/gelap.
### Must Not
- Periode Daftar dan Tren tidak dibangun di fase ini.
### Out of Scope
- Statistik per tag.

## Current State
- Relevant files: `app/pages/stats/{index,category/[id],budget/index,budget/[key],budget/new}.vue`,
  `app/components/charts/*`, `app/components/money/{BudgetForm,BudgetSummary,InsightCard}.vue`,
  `app/components/layout/{PeriodKindPicker,PeriodNav}.vue`,
  `app/features/{stats,budgets}/*`.
- Existing patterns: RPC `budget_status`, `stats` per periode, `period.ts`
  dengan tanggal awal bulan.

## Tasks
### T1: Kerangka Statistik dan donat
**What:** NavBar + pil periode + SubTabs + `MonthSwipe`; komponen `Donut` dan
daftar kategori.
**Files:** `app/pages/stats/index.vue`, `app/components/charts/Donut.vue`
**Verify:** total donat = total strip Transaksi bulan yang sama.

### T2: Rincian kategori
**What:** Grafik 6 bulan dengan rata-rata dan kolom ketuk, sub-kategori, daftar.
**Files:** `app/pages/stats/category/[id].vue`, `app/components/charts/MonthBars.vue`
**Verify:** ketuk kolom berganti bulan tanpa pindah halaman.

### T3: Budget dan Atur budget
**What:** Sub-tab Budget, daftar Atur budget dengan sub yang bisa dibuka.
**Files:** `app/pages/stats/budget/index.vue`, `app/components/money/BudgetRow.vue`
**Verify:** `break-ui`: 0 budget, lewat 300%, nama kategori panjang.

### T4: Rincian budget, per bulan, isi nominal
**What:** Tiga halaman bertumpuk (push/pop R2) memakai `Keypad` R4.
**Files:** `app/pages/stats/budget/[key].vue`, `app/pages/stats/budget/[key]/month.vue`,
`app/pages/stats/budget/[key]/amount.vue`
**Verify:** ubah budget Nov → Okt tetap, Des ikut Nov.

### T5: Statistik per catatan
**What:** RPC baca pengeluaran per `note` dalam periode (migration fungsi saja,
tanpa tabel baru) dan sub-tab Catatan.
**Files:** `supabase/migrations/*_stats_by_note.sql`, `app/features/stats/api.ts`,
`app/components/money/NoteStats.vue`
**Verify:** test SQL di `supabase/tests/stats_test.sql`.
