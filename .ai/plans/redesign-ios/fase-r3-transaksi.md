# Fase R3: Tab Transaksi

## Why
Tab Transaksi dibuka setiap kali app dibuka. Mockup menyamakan alurnya dengan
Realbyte: ketuk tanggal untuk mencatat di tanggal itu, lima tampilan, cari dan
filter dari bar atas. Banyak dari ini belum ada (lihat `design/ios/Gaps.dc.html`
bagian Transaksi).

## What
Halaman `/` digambar ulang sesuai layar `daily`, `calendar`, `calendar-day`,
`weekly`, `monthly`, `summary`, `search`, `filter`, `bookmark` di mockup, plus
mode pilih banyak.

## Constraints
### Must
- Bar atas: Cari, `MonthNav`, Filter; `SubTabs` Harian · Kalender · Mingguan ·
  Bulanan · Ringkasan; `SummaryStrip`; chip lingkup total akun (`.scope`) bila
  ada total yang tampil di Transaksi (fitur yang sudah ada).
- **Harian** (`App.dc.html` baris 82–95): kepala tanggal = tombol (tanggal besar,
  hari berwarna: Sabtu biru, Minggu merah, bulan, masuk, keluar). Ketuk = form
  catat dengan tanggal itu. Baris: kategori/sub di kiri, catatan + akun di
  tengah, nominal kanan. Kosong: "Belum ada transaksi".
- **Kalender**: kepala hari, sel dengan masuk/keluar/selisih. Ketuk tanggal =
  lembar hari itu (daftar + "Catat di 30 Okt"), bisa ditarik turun.
- **Mingguan**: total per minggu, minggu ini disorot, ketuk = Harian di minggu itu.
- **Bulanan**: bulan dalam tahun, ketuk = buka rincian per minggu di bawahnya.
- **Ringkasan**: Budget dengan garis hari ini dan "Atur ›", pengeluaran per grup
  akun, transfer tidak dihitung, banding bulan lalu, tombol Ekspor ke Excel.
- **Cari** (modal): kolom cari, chip periode/akun/kategori, hasil per hari +
  jumlah dan total. Chip Tag tidak ditampilkan (catatan fitur).
- **Filter** (modal): segmented Masuk/Keluar/Akun, centang kategori + sub atau
  akun dengan nominal, "Pilih semua/Kosongkan", tombol "Tampilkan N transaksi".
- **Bookmark** (modal, data `templates`): ketuk = form catat terisi, tanggal hari
  ini; mode Ubah untuk hapus dan urutkan (seret pegangan).
- **Pilih banyak**: tahan baris 450ms → mode pilih, centang baris, bar aksi
  bawah (kaca) dengan aksi yang sudah ada di `BulkTxBar`. Tanpa seleksi teks iOS.
- Transaksi baru disorot WAAPI 1400ms (`componentDidUpdate`, baris 1235–1243).
- iPad landscape/desktop: daftar kiri, kolom kanan sesuai tata letak lama, gaya iOS.
### Must Not
- Tidak ada geser-hapus di baris.
- Tidak ada animasi saat pindah sub-tab.
### Out of Scope
- Isi form catat (R4). Memo harian dan tanda (!) (catatan fitur).

## Current State
- Relevant files: `app/pages/index.vue`, `app/pages/search.vue`,
  `app/components/money/{TransactionRow,BulkTxBar,BudgetSummary,PendingRecurring}.vue`,
  `app/components/data/{ListGroup,SelectionBar,SelectCheck}.vue`,
  `app/features/transactions/*`, `app/features/search/*`, `app/features/templates/*`,
  `app/features/export/*`.
- Existing patterns: data per bulan dari RPC ledger, `useTxDisplay` untuk label
  baris, `useBulk` untuk aksi massal, pencarian di `/search`.

## Tasks
### T1: Kerangka halaman dan Harian
**What:** NavBar + SubTabs + SummaryStrip + `MonthSwipe`; komponen `DayGroup`
dan `TxRow` gaya mockup; kepala tanggal membuka form dengan tanggal.
**Files:** `app/pages/index.vue`, `app/components/money/{DayGroup,TxRow}.vue`
**Verify:** geser bulan, ketuk kepala tanggal, gelap/terang, `break-ui` untuk
catatan panjang.

### T2: Kalender dan lembar hari
**What:** Grid kalender dan `IosSheet` hari terpilih.
**Files:** `app/components/money/{TxCalendar,DaySheet}.vue`
**Verify:** tanggal awal bulan ≠ 1 (periode 25 Sep – 24 Okt) tetap benar.

### T3: Mingguan, Bulanan, Ringkasan
**What:** Tiga tampilan dari data yang sudah ada; Bulanan dengan baris minggu
yang bisa dibuka; Ringkasan memakai budget dan ekspor yang ada.
**Files:** `app/components/money/{WeekList,MonthList,MonthSummary}.vue`,
`app/features/stats/*` (RPC baca kalau perlu ringkasan per minggu)
**Verify:** angka sama dengan Statistik untuk bulan yang sama.

### T4: Cari, Filter, Bookmark
**What:** Tiga modal dari R2. Cari memakai `features/search`; Filter menyaring
daftar Transaksi; Bookmark memakai `features/templates` (ubah label UI
"Template" → "Bookmark" di seluruh app).
**Files:** `app/components/money/{SearchModal,FilterModal,BookmarkModal}.vue`,
`app/pages/search.vue` (alihkan ke modal), `app/features/templates/*`
**Verify:** filter aktif terlihat di bar atas; bookmark membuka form terisi.

### T5: Pilih banyak dengan tahan lama
**What:** Long-press di `TxRow` masuk mode pilih; bar aksi kaca; keluar dengan
Batal atau setelah aksi.
**Files:** `app/components/money/{TxRow,BulkTxBar}.vue`,
`app/features/transactions/useBulk.ts`
**Verify:** iPhone asli: tidak muncul menu salin/seleksi teks; gulir tidak
memicu mode pilih.
