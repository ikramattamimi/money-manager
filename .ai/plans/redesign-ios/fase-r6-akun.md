# Fase R6: Akun

## Why
Di Realbyte rincian akun mengikuti bulan yang dipilih di Transaksi dan
menunjukkan saldo berjalan. Aplikasi sekarang menampilkan 200 transaksi terakhir
tanpa bulan (`Gaps.dc.html` bagian Akun).

## What
Halaman `/accounts` dan turunannya sesuai layar `accounts`, `account-detail`,
`card-detail`, `totals`, `total-form`.

## Constraints
### Must
- **Akun**: NavBar "Akun" dengan tombol … (Total akun) dan +; strip Aset /
  Liabilitas / Total; kartu total akun mendatar (yang tampil di Transaksi
  disorot) + "+ Total baru"; kartu **Tren aset bersih** 6 bulan (sparkline);
  grup akun bisa dilipat (chevron berputar 200ms) dengan total per grup.
- Saldo di daftar = saldo **per akhir bulan terpilih**.
- **Rincian akun**: kembali "‹ Akun", pensil = ubah akun, `MonthNav` yang sama
  dengan Transaksi, SubTabs Harian/Bulanan, strip Setoran/Penarikan/Saldo,
  Harian dengan saldo berjalan di bawah tiap nominal, kepala tanggal bisa
  diketuk untuk catat dengan akun ini, geser = pindah bulan.
- **Kartu kredit**: strip Tagihan (jatuh tempo) / Belum ditagih / Sisa limit,
  periode tagihan, tanggal bayar, rekening pembayar, tombol **Bayar tagihan**
  (membuka form transfer terisi).
- **Total akun**: daftar Σ dengan saldo, akun yang belum masuk total; form
  Batal/Simpan, nama, saklar Tampilkan di Transaksi, centang akun, Hapus total.
- Layar lama digambar ulang dengan gaya iOS: form akun, sesuaikan saldo,
  kelola grup akun (urut seret).
### Must Not
- Tidak mengubah cara saldo dihitung (saldo awal + transaksi).
### Out of Scope
- Mata uang lain.

## Current State
- Relevant files: `app/pages/accounts/**`, `app/components/money/{AccountForm,AccountGroupForm,AccountTotalForm,AdjustBalanceForm,CardBill,BankRow}.vue`,
  `app/features/accounts/{api,billing,useAccounts}.ts`, RPC `years_overview`.
- Existing patterns: `billing.ts` menghitung tagihan kartu; total akun sudah ada
  sejak commit `6ef455c`.

## Tasks
### T1: Daftar akun
**What:** Kerangka halaman, kartu total, tren aset bersih, grup yang bisa dilipat,
saldo per akhir bulan terpilih.
**Files:** `app/pages/accounts/index.vue`, `app/components/money/{TotalCard,NetWorthSpark}.vue`,
`app/features/accounts/api.ts` (RPC baca saldo per tanggal bila belum ada)
**Verify:** total = jumlah grup; bulan lalu menunjukkan saldo lama.

### T2: Rincian akun per bulan
**What:** Harian dengan saldo berjalan + Bulanan dengan saldo akhir, mengikuti
bulan bersama.
**Files:** `app/pages/accounts/[id]/index.vue`, `app/features/accounts/useAccountMonth.ts`
**Verify:** saldo akhir bulan = saldo di daftar akun bulan itu.

### T3: Kartu kredit
**What:** Tampilan kartu di rincian akun dan tombol Bayar tagihan.
**Files:** `app/components/money/CardBill.vue`, `app/pages/accounts/[id]/index.vue`
**Verify:** unit test `billing.test.ts` tetap lulus.

### T4: Total akun dan form lama
**What:** Gambar ulang `totals/*`, `groups/*`, `new`, `[id]/edit`, `[id]/adjust`.
**Files:** `app/pages/accounts/{totals,groups}/**`, `app/pages/accounts/{new,[id]/edit,[id]/adjust}.vue`
**Verify:** buat, ubah, hapus total; urut grup.
