# Fase 10: Penyempurnaan Periode, Navigasi, Statistik, dan Kaitan Transaksi

## Why
Setelah dipakai sehari-hari, ada lima hal yang mengganjal:

1. Gajian tidak tanggal 1. Kalau gaji masuk tanggal 25, "bulan" keuangan
   berjalan 25 → 24 bulan depan, tapi semua tampilan masih memakai bulan
   kalender, jadi budget dan statistik terbelah dua.
2. Tombol + mengambang di sebelah tab bar dan tampil di semua tab, padahal
   hanya berguna di tab Transaksi dan Akun.
3. Tab Transaksi baru punya Harian, Kalender, dan Bulanan. Belum bisa melihat
   ringkasan per tahun.
4. Grafik 6 bulan di Statistik hanya batang tanpa angka, dan warnanya (biru dan
   merah) tidak senada dengan kartu pengeluaran per kategori.
5. Statistik hanya menjawab "uang pergi ke mana". Belum ada gambaran gabungan
   seperti selisih masuk dan keluar atau rasio tabungan.
6. Pengeluaran yang nanti diganti (reimburse kantor, teman yang membayar
   utangnya) tercatat dua kali: pengeluarannya tetap terhitung, dan uang
   penggantinya terhitung sebagai pemasukan. Total pengeluaran dan pemasukan
   jadi lebih besar dari kenyataan.

## What
1. Pengaturan **tanggal awal bulan** (1–31) per buku. Semua tampilan bulanan
   memakai periode itu, dan setiap tampilan bulan menyebut rentangnya
   (mis. "25 Okt – 24 Nov").
2. Tombol + dipindah ke atas tab bar dan hanya tampil di tab Transaksi dan Akun.
3. Tampilan **Tahunan** di tab Transaksi.
4. Angka di grafik masuk/keluar 6 bulan, dengan warna yang senada dengan
   kartu per kategori.
5. Kartu **Ringkasan insight** di Statistik.
6. **Kaitkan transaksi**: pemasukan bisa dikaitkan ke satu atau beberapa
   pengeluaran yang digantinya. Bagian yang dikaitkan tidak dihitung sebagai
   pengeluaran maupun pemasukan. Contoh: berobat Rp100.000 tanggal 2 Okt,
   reimburse kantor Rp100.000 tanggal 25 Okt → pengeluaran berobat jadi Rp0 dan
   reimburse bukan pemasukan. Tidak ada jenis "utang" atau "reimburse"
   tersendiri; cukup satu mekanisme kaitan.

## Constraints
### Must
- Tanggal awal bulan disimpan **per buku** (`books.month_start_day`, default 1),
  karena budget dan statistik milik buku. Hanya pemilik yang bisa mengubahnya;
  anggota lain melihat periode yang sama
- Tanggal 29–31 di bulan yang lebih pendek jatuh ke **hari terakhir bulan itu**
  (awal 31 → Februari mulai 28/29)
- Nama periode mengikuti bulan tempat periode **dimulai**: awal 25 → periode
  "Oktober" = 25 Okt – 24 Nov. Aturan ini ditulis sekali di `app/lib/time.ts` dan
  di satu fungsi SQL, lalu dipakai semua tempat; tidak dihitung ulang di halaman
- Semua RPC yang menerima `(p_year, p_month)` memakai batas periode yang sama
  dengan client: `months_overview`, `monthly_trend`, `budget_status`,
  `category_breakdown` (lewat periode statistik), kalender, dan ekspor per bulan
- Rentang tampil di setiap pemilih bulan (header Transaksi, Statistik, Budget)
  kalau tanggal awal bukan 1. Kalau tanggal awal 1, tampilan tetap seperti
  sekarang
- Tombol + tetap Liquid Glass (navigasi yang melayang), posisinya di atas tab
  bar sisi kanan, dan tidak menutupi baris terakhir daftar
- Angka di grafik memakai format ringkas (`formatShort`, mis. "1,2 jt") dan
  nilai lengkap tetap ada di tabel tersembunyi untuk pembaca layar
- Warna grafik dari token tone (`r1`–`r6`, `TONE_FILL`), sama dengan
  `CompositionBar`. Masuk dan keluar tetap bisa dibedakan tanpa warna (legenda
  dan urutan batang)
- Insight dihitung dari RPC yang sudah ada atau satu RPC baru; tidak menarik
  semua transaksi ke client
- Kaitan menyimpan **nominal yang dikaitkan**, jadi penggantian boleh tidak sama
  dengan pengeluarannya: sebagian (teman baru membayar Rp60.000 dari
  Rp100.000), dicicil (beberapa pemasukan ke satu pengeluaran), atau satu
  pemasukan untuk beberapa pengeluaran (reimburse beberapa nota sekaligus).
  Total kaitan tidak boleh melebihi nominal pengeluaran maupun pemasukannya
  (dicek di database)
- Hitungan bersih: pengeluaran dihitung `nominal − total kaitannya`, pemasukan
  dihitung `nominal − total kaitannya`. Sisa pemasukan yang tidak terkait tetap
  pemasukan. Aturan ini satu tempat di SQL dan dipakai semua RPC statistik,
  ringkasan bulan, tren, tahunan, budget, dan insight
- Pengurangan berlaku di **periode pengeluarannya**: reimburse bulan November
  untuk berobat bulan Oktober menurunkan pengeluaran Oktober
- **Saldo akun tidak berubah**: kaitan hanya memengaruhi statistik, uangnya
  tetap benar-benar keluar dan masuk

### Must Not
- Mengubah `occurred_at` transaksi yang sudah ada. Pengaturan hanya mengubah
  cara transaksi dikelompokkan
- Insight yang menghakimi ("kamu boros"). Kalimatnya netral dan berangka
- Jenis transaksi baru untuk utang atau reimburse. Kaitan hanya antara
  pemasukan dan pengeluaran yang sudah ada (bukan transfer, bukan koreksi saldo)

### Out of Scope
- Tanggal awal minggu (Senin/Minggu) yang bisa diatur
- Tanggal awal berbeda per bulan (mis. ikut hari kerja terakhir)
- Daftar utang-piutang per orang dan pengingat tagihan
- Insight berbasis AI

## Current State
- Relevant files:
  - Batas bulan: `app/lib/time.ts` (`monthRange`), `app/features/stats/period.ts`
  - RPC per bulan: `months_overview` (`20261024122229_ledger_rpc.sql`),
    `monthly_trend` dan `budget_status` (`20261024180506_stats_rpc.sql`), semuanya
    memakai `make_timestamptz(year, month, 1)` / `date_trunc('month')`
  - Tab Transaksi: `app/pages/index.vue` (`VIEWS` harian/kalender/bulanan)
  - Tombol +: `app/components/layout/AddButton.vue`, dipasang di `AppShell.vue`
    untuk semua tab; tab bar di `TabBar.vue` menyisakan `right-[84px]` untuknya
  - Statistik: `app/pages/stats/index.vue`, `app/components/charts/TrendBars.vue`
    (`bg-primary-accent` / `bg-bad`), `CompositionBar.vue` (`TONE_FILL`)
  - Pengaturan buku: `app/pages/settings/books/[id].vue` (fase 9)
- Existing patterns:
  - Batas waktu di SQL selalu `Asia/Jakarta`
  - Query key berisi `bookId`; key statistik/budget di bawah `['transactions', …]`

## Tasks

### T1: Tanggal awal bulan
**What:** Kolom `books.month_start_day smallint not null default 1 check (1–31)`
dan fungsi SQL `private.period_bounds(book_id, year, month)` → `[from, to)`.
RPC per bulan memakai fungsi itu. Di client, `periodRange(year, month,
startDay)` dan `periodOf(date, startDay)` di `app/lib/time.ts` menggantikan
`monthRange` di semua tempat, dengan `startDay` dari buku aktif. Pengaturan di
halaman buku (pemilik saja): pilih tanggal 1–31 dengan pratinjau
"Bulan Oktober = 25 Okt – 24 Nov". Pemilih bulan di Transaksi, Statistik, dan
Budget menampilkan rentang di bawah nama bulan. "Bulan ini" saat dibuka
tanggal 26 Okt dengan awal 25 = periode Oktober; tanggal 10 Okt = periode
September.
**Files:** migration baru, `app/lib/time.ts` (+ tes), `app/features/books/*`,
`app/pages/settings/books/[id].vue`, `app/features/stats/period.ts`,
`app/features/transactions/api.ts`, `app/pages/index.vue`,
`app/pages/settings/export.vue`, tes SQL
**Verify:** Dengan awal 25, transaksi 24 Okt 23.59 WIB masuk periode
September dan 25 Okt 00.00 WIB masuk periode Oktober, sama di tab Transaksi,
Statistik, Budget, dan ekspor. Awal 31: periode Februari 2027 = 28 Feb – 30 Mar.
Awal 1 menghasilkan angka yang persis sama dengan sebelum fase ini.

### T2: Tombol + di atas tab bar
**What:** `AddButton` pindah ke atas tab bar (sisi kanan, di atas safe area +
tinggi tab bar), tab bar kembali selebar layar. Tombol hanya tampil di rute
tab Transaksi (`/`) dan Akun (`/accounts`), masuk/keluar dengan scale + fade
(Emil: keluar lebih cepat dari masuk). Di iPad (tab bar di atas) tombol tetap
di kanan bawah dengan aturan tab yang sama. Desktop tidak berubah (kolom catat
transaksi). Padding bawah konten menyesuaikan supaya baris terakhir tidak
tertutup.
**Files:** `AddButton.vue`, `AppShell.vue`, `TabBar.vue`
**Verify:** Di iPhone (standalone), tombol tampil di Transaksi dan Akun, hilang
di Statistik dan Lainnya, tidak menutupi tab bar maupun baris terakhir.

### T3: Tampilan Tahunan di Transaksi
**What:** Opsi keempat `Tahunan` di `VIEWS`. Daftar per tahun (dari tahun
transaksi pertama sampai tahun ini): pemasukan, pengeluaran, selisih, dan
jumlah transaksi. Tap tahun → tampilan Bulanan tahun itu. Navigasi header
berganti per rentang tahun saat tampilan ini aktif. RPC `years_overview`
(mengikuti `months_overview`).
**Files:** migration baru, `app/features/transactions/*`, `app/pages/index.vue`
**Verify:** Total satu tahun di Tahunan = jumlah 12 bulan di Bulanan tahun itu.
Dengan tanggal awal ≠ 1, tahun mengikuti periode bulan (tahun 2026 = periode
Januari 2026 s.d. Desember 2026).

### T4: Angka dan warna grafik 6 bulan
**What:** `TrendBars` menampilkan nominal ringkas di atas tiap batang (atau di
bawah label bulan kalau sempit di HP), bulan yang dipilih ditebalkan. Warna
diganti ke token tone yang senada dengan `CompositionBar` (mis. masuk `r1`,
keluar `r4`; ditentukan sekali di `tone.ts`), dipakai juga di grafik tren
rincian kategori. Legenda ikut berubah.
**Files:** `app/components/charts/TrendBars.vue`, `app/components/data/tone.ts`,
`app/pages/stats/index.vue`, `app/pages/stats/category/*`
**Verify:** Di 375 px angka 6 bulan terbaca tanpa tumpang tindih, kontras
lolos di mode terang dan gelap, pembaca layar membaca tabel nilai lengkap.

### T5: Ringkasan insight
**What:** Kartu "Ringkasan" di Statistik untuk periode terpilih, berisi:
- Selisih pemasukan − pengeluaran dan rasio tabungan (selisih ÷ pemasukan)
- Perbandingan dengan periode sebelumnya (pengeluaran naik/turun berapa %)
- Rata-rata pengeluaran per hari, dan proyeksi akhir periode kalau periode
  masih berjalan
- Kategori dengan kenaikan terbesar dibanding periode sebelumnya
- Hari dengan pengeluaran terbesar
- Status budget singkat (berapa kategori lewat/hampir habis), kalau ada budget
Data dari satu RPC `period_insight(book_id, from, to)` yang mengembalikan angka
mentah; kalimatnya disusun di client. Baris yang datanya tidak ada disembunyikan.
**Files:** migration baru, `app/features/stats/*`,
`app/components/money/InsightCard.vue`, `app/pages/stats/index.vue`
**Verify:** Angka selisih dan rasio sama dengan perhitungan manual dari kartu
pemasukan dan pengeluaran. Periode kosong menampilkan keadaan kosong, bukan
"0%" atau pembagian dengan nol.

### T6: Kaitkan transaksi (reimburse dan utang)
**What:**
- Tabel `transaction_offsets (id, book_id, expense_id, income_id, amount, created_at)`
  dengan RLS per buku seperti `transactions`. Trigger menolak kaitan yang
  bukan pengeluaran ↔ pemasukan, beda buku, atau membuat total kaitan melebihi
  nominal salah satu sisi. Hapus salah satu transaksi = kaitannya ikut terhapus;
  mengubah nominal di bawah total kaitan ditolak dengan pesan yang jelas.
- Fungsi SQL `private.net_amount(transaction)` (nominal − total kaitan) dipakai
  `months_overview`, `monthly_trend`, `category_breakdown`, `budget_status`,
  `years_overview` (T3), dan `period_insight` (T5). Kerjakan T6 sebelum T3 dan T5
  supaya RPC baru langsung memakai hitungan bersih.
- Form transaksi pemasukan: tombol "Ganti pengeluaran" → daftar pengeluaran
  yang masih punya sisa (urut terbaru, bisa dicari), pilih satu atau lebih,
  nominal kaitan terisi otomatis (sisa pengeluaran, dibatasi sisa pemasukan)
  dan bisa diubah. Dari detail pengeluaran juga bisa "Tandai sudah diganti"
  → membuka form pemasukan baru yang sudah terkait.
- Tampilan: baris pengeluaran yang terkait menampilkan nominal asli dicoret
  tipis dengan nominal bersih di bawahnya (mis. "Rp100.000 → Rp0, diganti
  25 Okt"); baris pemasukan menampilkan "mengganti Berobat". Detail transaksi
  menampilkan daftar kaitan dan tombol lepas kaitan.
**Files:** migration baru (+ tes SQL), `app/features/transactions/*`,
`app/components/money/TransactionForm.vue`, `TransactionRow.vue`,
`app/pages/transaction.vue`, RPC statistik yang ada
**Verify:**
- Berobat Rp100.000 (2 Okt) dikaitkan reimburse Rp100.000 (25 Okt): pengeluaran
  Oktober dan kategori Kesehatan turun Rp100.000, pemasukan Oktober tidak
  bertambah, saldo akun tetap sama dengan sebelum dikaitkan.
- Utang teman Rp100.000, dibayar Rp60.000: pengeluaran bersih Rp40.000. Lalu
  dibayar lagi Rp50.000 dengan kaitan Rp40.000: pengeluaran Rp0 dan Rp10.000
  sisanya tetap pemasukan.
- Reimburse bulan November untuk berobat bulan Oktober menurunkan statistik
  Oktober, bukan November.
- Kaitan yang melebihi nominal ditolak database walau dipanggil langsung lewat API.
