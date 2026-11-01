# Fase R1: Fondasi Gaya iOS

## Why
Semua layar mockup dibangun dari satu set kelas di `design/ios/ios.css`. Kalau
token dan komponen ini belum ada di Nuxt, tiap fase berikutnya membuat versinya
sendiri dan tema opnamix lama tercampur dengan gaya baru.

## What
1. Token warna iOS untuk mode terang (dari mockup) dan gelap (diturunkan dari
   warna sistem iOS), tipografi sistem, token gerak dari mockup.
2. Komponen dasar Vue yang setara kelas mockup.
3. Tab bar dan tombol + baru, termasuk menu tahan.
4. Katalog di `/prototype/ui` diganti dengan komponen baru, terang dan gelap.

## Constraints
### Must
- **Token terang persis mockup** (`.app` di `ios.css` baris 2): `--bg #F2F2F7`,
  `--card #FFF`, `--sep #E3E3E8`, `--label #1C1C1E`, `--sec #6C6C70`,
  `--ter #8E8E93`, `--accent #0064D6`, `--accent-soft #E5EFFD`,
  `--inc #0064D6`, `--exp #D70015`, `--ok #248A3D`, plus nada ikon kategori
  dari `Icon.dc.html` (`TONES`: latar lembut, tinta, solid).
- **Token gelap** mengikuti iOS dark grouped: latar `#000`, kartu `#1C1C1E`,
  isian kedua `#2C2C2E`, garis `#38383A`, label `#FFF`, sekunder `#98989F`,
  aksen `#0A84FF`, pemasukan `#409CFF`, pengeluaran `#FF6961`. Kontras teks
  ≥ 4,5:1 diuji. Nada ikon gelap: latar gelap redup, tinta terang.
- Tiga pilihan tema tetap (`useTheme`: terang/gelap/sistem), `theme-color`
  meta ikut token latar.
- Font: `-apple-system, 'SF Pro Text', 'Inter', system-ui`. Angka
  `tabular-nums`. DM Sans dan DM Mono dilepas.
- Token gerak dari mockup: `--ease-out cubic-bezier(0.23,1,0.32,1)`,
  `--ease-drawer cubic-bezier(0.32,0.72,0,1)`, `--ease-in-out
  cubic-bezier(0.77,0,0.175,1)`; tekan 100–160ms skala 0,92–0,98.
- **Liquid Glass hanya** di tab bar, tombol +, menu tahan, toast, dan bar aksi
  bawah (`ios.css`: `.tabbar`, `.qmenu`, `.toast`). Permukaan lain solid.
  `prefers-reduced-transparency` → solid (`ios.css` baris 261).
- Tab bar: 4 tab (Transaksi dengan ikon kalender berisi tanggal hari ini,
  Statistik, Akun, Lainnya), tombol + bulat terpisah di kanan, gradasi
  `.edge` di bawah konten.
- Tombol +: ketuk = catat; tahan (atau klik kanan) = menu **Dari bookmark /
  Ketik cepat / Mutasi bank / Foto struk**. Menu masuk 200ms skala+opacity dari
  pojok tombol.
### Must Not
- Tidak ada warna atau durasi literal di komponen; semua lewat token.
- Jangan hapus komponen lama yang masih dipakai halaman; penggantian halaman di
  R3–R7, pembersihan di R8.
### Out of Scope
- Navigasi push/pop dan gestur (R2).
- Menggambar ulang halaman (R3–R7).

## Current State
- Relevant files: `app/assets/css/tokens.css` (token opnamix, `--font-sans` DM
  Sans di baris 191), `app/assets/css/effects.css` (Liquid Glass `.lg`),
  `app/components/layout/{TabBar,AddButton,AppShell,AppSidebar,PageHeader,CompactTopBar}.vue`,
  `app/components/data/*`, `app/components/base/*`, `app/composables/useTheme.ts`,
  `app/pages/prototype/*`.
- Existing patterns: komponen data dan base sudah dipisah; `ToneIcon` + `tone.ts`
  untuk ikon kategori; `useToast` dengan Urungkan.

## Tasks
### T1: Token iOS terang dan gelap
**What:** Ganti isi `tokens.css` dengan token mockup + turunan gelap, petakan ke
nama Tailwind yang sudah dipakai (`bg-background`, `bg-card`, `text-foreground`,
`text-muted-foreground`, `text-faint`, `text-bad`, `text-primary-accent`) supaya
halaman lama tidak rusak. Tambah token nada ikon 10 warna.
**Files:** `app/assets/css/tokens.css`, `app/assets/css/main.css`,
`app/composables/useTheme.ts`, `app/components/data/tone.ts`
**Verify:** `/prototype/tokens` terang dan gelap; cek kontras dengan skill
`design:accessibility-review`.

### T2: Komponen dasar iOS
**What:** Buat komponen setara kelas mockup:
`NavBar` (`.nav`/`.navrow`: tombol kembali berlabel, judul tengah, aksi kanan,
varian `line`, slot baris kedua untuk navigasi bulan dan `subtabs`),
`SubTabs` (`.subtabs`), `SummaryStrip` (`.strip` 3 kolom Pemasukan/Pengeluaran/Total),
`GroupedList` + `GroupRow` (`.grp`/`.row`/`.rl`/`.rv`/`.chev`, `--inset`),
`SectionHeader` (`.sh` dengan tautan kanan), `Segmented` (`.seg`), `Chip`,
`IosButton` (`btn`, `soft`, `gray`, `red`), `IosSwitch` (`.sw`), `CategoryIcon`
(port `Icon.dc.html`: polos/solid, ukuran), `EmptyState` (`.empty`),
`IosAlert` (`.ialert`, masuk `mmAlert` 220ms), `Toast` di atas (`.toast`,
`mmToast` 300ms) dengan Urungkan.
**Files:** `app/components/ios/*` (folder baru), `app/composables/useToast.ts`
**Verify:** semua tampil di `/prototype/ui`, terang/gelap, target sentuh ≥ 44px.

### T3: Lembar bawah (sheet) dan panel dock
**What:** `IosSheet` (`.scrim`, `.sheet`, `.grab`; masuk `mmUp` 320ms, keluar
200ms) dengan tarik-turun ikut jari: rubber-band ke atas, tutup kalau proyeksi
> 35% tinggi atau dilempar, scrim memudar sesuai jarak (`sDown/sMove/sUp` di
`App.dc.html` baris 1483–1523). `Dock` (`.dock`/`.dockh`/`.dockb`) untuk panel
papan angka/grid yang menempel di bawah; ganti isi tanpa animasi.
**Files:** `app/components/ios/IosSheet.vue`, `app/components/ios/Dock.vue`,
`app/lib/gesture.ts` (tambah `project(v)` dan `rubber(x, w, k)` dari mockup)
**Verify:** unit test `gesture.test.ts` untuk `project`/`rubber`; tarik sheet di
browser pane mode HP.

### T4: Tab bar, tombol +, menu tahan
**What:** Ganti `TabBar` dan `AddButton` dengan versi mockup (`.tabbar`, `.tab`,
`.tdate`, `.fab`, `.qmenu`, `.qscrim`). Menu tahan memakai long-press 450ms +
`contextmenu`, tanpa seleksi teks iOS. iPad: tab bar atas tengah; desktop:
`AppSidebar` digambar ulang dengan token iOS (latar `--card`, baris gaya
`GroupRow`).
**Files:** `app/components/layout/TabBar.vue`, `AddButton.vue`, `AppShell.vue`,
`AppSidebar.vue`
**Verify:** HP/iPad/desktop di browser pane; Reduce Motion (menu jadi fade 150ms).

### T5: Perbarui konvensi
**What:** Tulis ulang bagian Token, Kaca, dan komponen di
`.ai/conventions/design.md` sesuai R1.
**Files:** `.ai/conventions/design.md`
**Verify:** tidak ada lagi rujukan ke pita gradien/kaca opnamix untuk layar baru.
