# Fase 3: Design System dan Prototipe

## Why
Keluhan utama user adalah input yang lambat dan melelahkan. Untuk app yang
dibuka beberapa kali sehari, rasa pakainya sama pentingnya dengan fiturnya:
tombol yang telat merespons, sheet yang tidak bisa ditarik, dan animasi yang
harus ditunggu membuat orang malas mencatat. Kalau design system belum ada
saat fase 4 mulai, setiap layar membuat versinya sendiri dan harus dirapikan
ulang.

Fase ini menerapkan skill `apple-design` (prinsip WWDC *Designing Fluid
Interfaces* yang diterjemahkan ke web) supaya app terasa seperti app iPhone
asli, bukan situs web yang dibungkus.

## What
1. Token desain (warna, tipografi, jarak, radius, material, spring) untuk mode
   terang dan gelap.
2. Komponen dasar dengan gerak yang bisa disela, terutama bottom sheet, tab bar,
   dan keypad nominal.
3. Prototipe interaktif layar utama dengan data tiruan, dicoba di iPhone asli
   sebelum fase 4 dimulai.

## Constraints
### Must
- **Respons di pointer-down**, bukan saat jari diangkat. Tombol mengecil
  (`scale(0.97)`) seketika saat ditekan
- **Semua gerak yang bisa disentuh pakai spring**, bukan CSS transition atau
  `@keyframes`. Default critically damped (`bounce: 0`, `duration` 0,3-0,4 s).
  Bounce (~0,2) hanya setelah gestur yang membawa momentum (flick sheet,
  swipe baris)
- **Bisa disela kapan saja**: sheet yang sedang menutup bisa ditangkap lagi dan
  mengikuti jari. Animasi baru selalu mulai dari posisi di layar saat itu
- **Kecepatan jari diteruskan** ke spring saat dilepas. Titik berhenti sheet
  dipilih dari proyeksi momentum (`decelerationRate` 0,998), bukan dari posisi
  saat dilepas
- **Rubber-band** di batas (sheet ditarik melewati atas, list di ujung)
- **Jalur masuk = jalur keluar**. Sheet dari bawah kembali ke bawah. Popover
  muncul dari tombol pemicunya (`transform-origin`)
- **Material tembus pandang** untuk tab bar, header, dan sheet
  (`backdrop-filter`), konten bergulir di bawahnya. Tidak menumpuk dua lapisan
  tembus pandang terang
- **Tipografi system font** (`-apple-system`/`system-ui`, SF Pro di iPhone).
  Tracking negatif untuk angka besar (saldo), body ~0. Angka nominal memakai
  `font-variant-numeric: tabular-nums` supaya kolom rapi
- **Hormati preferensi aksesibilitas**: `prefers-reduced-motion` (ganti slide
  dan spring dengan cross-fade), `prefers-reduced-transparency` (material jadi
  solid), `prefers-contrast: more`, dan ukuran teks iOS (jarak pakai `rem`)
- Haptik/getar hanya di momen penting (transaksi tersimpan, hapus), di frame
  yang sama dengan animasinya. Catatan: Safari iOS tidak mendukung Vibration
  API, jadi haptik bersifat opsional
- Target sentuh minimal 44×44 pt, safe area dihormati di semua sisi
- Label spesifik bahasa Indonesia ("Transaksi", "Akun", "Statistik"), bukan
  label umum seperti "Beranda"
- Hanya properti `transform` dan `opacity` yang dianimasikan

### Must Not
- Animasi yang mengunci input selama berjalan
- Konfirmasi dialog untuk aksi yang bisa di-undo. Hapus transaksi cukup
  dengan toast "Dihapus · Urungkan". Dialog hanya untuk aksi yang tidak bisa
  dibatalkan (hapus akun beserta transaksinya, batalkan impor)
- Warna, jarak, durasi, atau parameter spring yang ditulis langsung di
  halaman. Semuanya lewat token
- Meniru branding Apple (logo, ikon SF Symbols asli). Yang ditiru prinsip
  geraknya, bukan asetnya

### Out of Scope
- Logika data asli (fase 4). Prototipe memakai mock
- Grafik statistik final (fase 7). Cukup kerangka layarnya

## Current State
- Relevant files:
  - Skill `apple-design`: `~/.claude/skills/apple-design/SKILL.md`
  - shadcn-vue dari fase 1 T3 (`app/components/ui`)
- Existing patterns:
  - Rumus dari skill: `project(v) = (v/1000)·d/(1−d)` dengan `d = 0.998`;
    `rubberband(x, dim, c = 0.55) = (x·dim·c)/(dim + c·|x|)`
  - `opnamix/src/features/ui-docs`: halaman katalog komponen, dijadikan acuan
    untuk `/prototype/ui`

## Tasks

### T1: Token desain
**What:** CSS variable di `:root` dan `[data-theme="dark"]` (plus
`prefers-color-scheme`) yang dibaca Tailwind:
- **Warna:** latar berlapis (`bg`, `bg-elevated`, `bg-grouped`), teks
  (`label`, `label-secondary`, `label-tertiary`), aksen, plus warna semantik
  `income` (hijau), `expense` (merah), `transfer` (netral/biru). Semua lolos
  kontras WCAG AA di kedua tema
- **Tipografi:** skala `large-title`, `title`, `headline`, `body`, `callout`,
  `footnote`, `caption`, masing-masing dengan `line-height` dan
  `letter-spacing` sendiri. Kelas `amount` untuk nominal (tabular, tracking
  negatif di ukuran besar)
- **Jarak & radius:** skala 4 pt, radius kartu dan sheet ala iOS
- **Material:** `material-thin`, `material-regular`, `material-thick` (blur +
  saturasi + opasitas), dengan versi solid untuk reduced transparency
- **Spring:** `spring.default` (`bounce 0`, `0.35`), `spring.snappy`
  (`bounce 0`, `0.25`), `spring.momentum` (`bounce 0.2`, `0.4`), `spring.sheet`
  (`bounce 0.15`, `0.3`)

**Files:** `app/assets/css/tokens.css` (Tailwind 4: token lewat `@theme`,
menggantikan token sementara di `app/assets/css/main.css`), `app/lib/motion.ts`
**Verify:** Halaman `/prototype/tokens` menampilkan semua token. Pindah tema
terang/gelap tidak berkedip (ada transisi lembut). Pemeriksa kontras lolos.

### T2: Primitif gestur
**What:** Composable Vue yang bisa dipakai ulang:
- `usePress`: state ditekan di `pointerdown`, batal kalau jari digeser
  keluar >10 px, commit di `pointerup`
- `useDrag`: Pointer Events + `setPointerCapture`, menghormati titik pegang,
  ambang arah 10 px, riwayat kecepatan beberapa event terakhir
- `projectMomentum`, `rubberband`, `nearestSnap` (fungsi murni, ada unit test)
- `useReducedMotion`, `useReducedTransparency`

**Files:** `app/composables/gesture/*.ts`, `app/lib/physics.ts`,
`app/lib/physics.test.ts`
**Verify:** Unit test fungsi fisika lolos. Di halaman uji, kotak yang di-drag
menempel di jari dari titik yang dipegang, bukan melompat ke tengah.

### T3: Bottom sheet
**What:** Komponen `Sheet` yang menjadi wadah utama form (tambah transaksi,
pilih akun, pilih kategori, filter). Fitur:
- Titik berhenti (`snapPoints`, mis. setengah dan penuh), dipilih lewat
  proyeksi momentum
- Bisa ditarik turun untuk menutup, bisa ditangkap lagi saat sedang menutup
- Rubber-band di atas titik tertinggi
- Latar diredupkan dan sedikit mengecil di belakang sheet (modal). Sheet
  bertumpuk meredupkan induknya bertahap
- Drag dari area konten yang bisa digulir hanya menggerakkan sheet kalau
  scroll sudah di paling atas
- Tetap rapi saat keyboard iOS muncul (`visualViewport`)
- Fokus terkunci di dalam sheet, `Esc` menutup, `aria-modal`

**Files:** `app/components/ui/sheet/*`
**Verify:** Di iPhone: flick cepat ke bawah dari posisi penuh langsung menutup
walau baru tergeser sedikit. Tarik pelan lalu lepas di tengah kembali ke titik
terdekat. Tangkap sheet saat sedang menutup → mengikuti jari tanpa lompatan.
Dengan Reduce Motion aktif: sheet muncul dengan cross-fade.

### T4: Kerangka navigasi
**What:**
- `TabBar` tembus pandang di bawah (Transaksi, Statistik, Akun, Lainnya),
  dengan tombol tambah yang menonjol. Menghormati safe area bawah
- `LargeTitleHeader`: judul besar yang mengecil jadi judul kecil saat
  digulir, dengan scroll edge effect (gradasi blur), bukan garis 1 px
- Transisi antar halaman: push dari kanan, kembali ke kanan. Swipe dari tepi
  kiri untuk kembali, mengikuti jari 1:1
- Pemilih bulan yang bisa di-swipe kiri/kanan (seperti di Realbyte)

**Files:** `app/components/layout/*`, `app/layouts/default.vue`
**Verify:** Tab bar tidak tertutup home indicator. Judul besar mengecil mulus
saat digulir. Swipe kembali bisa dibatalkan di tengah jalan.

### T5: Komponen input & daftar
**What:**
- `AmountKeypad`: keypad angka khusus (bukan keyboard iOS) dengan tombol
  `000`, operasi `+ − × ÷` untuk menghitung langsung, tampilan nominal besar
  yang berformat `Rp 25.000` saat diketik. Respons di pointer-down
- `TransactionRow`: emoji kategori, note, akun, nominal berwarna sesuai jenis.
  Swipe kiri untuk hapus/duplikat (dengan rubber-band dan spring momentum)
- `Chip` pilihan akun/kategori, `SegmentedControl` (Pengeluaran / Pemasukan /
  Transfer) dengan indikator yang meluncur dengan spring
- `Toast` dengan aksi "Urungkan"
- `EmptyState`, `Skeleton`

**Files:** `app/components/ui/*`, `app/components/money/*`
**Verify:** Halaman `/prototype/ui` memuat semua komponen dalam semua state
(normal, ditekan, nonaktif, error, loading). Keypad bisa mengetik
`25000+3500` dan menampilkan `Rp 28.500`.

### T6: Prototipe interaktif
**What:** Layar utama dengan data tiruan dari contoh xlsx Realbyte
(disamarkan): daftar transaksi harian, kalender, bulanan, sheet tambah
transaksi (segmented → keypad → akun → kategori → simpan), daftar akun dengan
total aset, dan kerangka statistik. Uji di iPhone asli, lalu catat temuan
(apa yang terasa lambat, mana yang perlu lebih sedikit langkah) di
`.ai/specs/design-review.md`.
**Files:** `app/pages/prototype/*`, `app/mocks/*`,
`.ai/specs/design-review.md`
**Verify:** Mencatat satu pengeluaran dari tap tombol tambah sampai tersimpan
cukup **≤ 4 tap** plus mengetik nominal. Semua gerak diputar pelan (DevTools
animation 10%) tanpa lompatan.

### T7: Pedoman desain
**What:** Dokumen singkat aturan desain project: kapan pakai spring yang mana,
kapan sheet vs halaman baru, kapan dialog vs undo, aturan material, dan
checklist review per layar (respons, interruptible, reduced motion, kontras,
safe area, label).
**Files:** `.ai/conventions/design.md`
**Verify:** Checklist dipakai di review PR fase 4.
