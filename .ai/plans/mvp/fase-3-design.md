# Fase 3: Design System dan Kerangka Responsif

## Why
App ini dibuka beberapa kali sehari, jadi rasa pakainya sama pentingnya dengan
fiturnya. Kalau design system belum ada saat fase 4 mulai, setiap layar membuat
versinya sendiri dan harus dirapikan ulang.

Arah desain sudah diputuskan lewat prototipe yang disetujui user
(24 Okt 2026), setelah dua percobaan sebelumnya ditolak:

- Hasil sesi Fase 3 pertama (branch `claude/fase-3-design-aac082`, gaya iOS
  dengan spring) ditolak. **Jangan di-merge.**
- Prototipe Liquid Glass penuh ditolak: kaca di semua permukaan terlihat ramai.

Yang disetujui: **tema design system opnamix**, dengan **Liquid Glass hanya di
lapisan yang melayang** (tab bar, tombol tambah, bar judul ringkas), dan gerak
mengikuti skill `emil-design-eng`. Fase ini memindahkan prototipe itu ke Nuxt
sebagai token dan komponen yang dipakai ulang.

## What
1. Token desain opnamix (warna, tipografi, radius, bayangan, gradien, kaca) untuk
   mode terang dan gelap, plus token gerak.
2. Kerangka aplikasi responsif untuk tiga ukuran: HP, iPad, desktop.
3. Komponen dasar hasil port dari opnamix (React) ke Vue.
4. Panel catat transaksi dengan tiga bentuk: sheet bawah, dialog, dan kartu
   inline.
5. Layar prototipe di Nuxt dengan data tiruan, identik dengan
   `design/prototype.html`.

## Acuan

| Sumber | Isi |
|---|---|
| `design/prototype.html` | **Acuan utama.** Semua layar, token, komponen, dan perilaku di fase ini harus sama dengan file ini |
| `design/preview.html` | Pratinjau prototipe di iPhone, iPad, iPad landscape, dan desktop berdampingan. Jalankan `npx serve design -l 4000` (atau config `design` di `.claude/launch.json`), buka `/preview` |
| `opnamix/src/index.css`, `opnamix/tailwind.config.js` | Sumber token. Nilai di prototipe disalin dari sini |
| `opnamix/src/components/{layout,data,charts,panel,ui}` | Komponen yang di-port: `PageHeader`, `StatChip`, `SegmentedControl`, `ListRow`/`GroupedList`, `ToneIcon`, `KpiStrip`, `Meter`, `CompositionBar`, `HBarList`, `SettingRow`, `Sidebar`, `ListWithPanel`, `Button` |
| Skill `emil-design-eng` | Aturan gerak: kapan animasi, kurva, durasi, gestur |

## Tata letak per ukuran

| Ukuran | Navigasi | Catat transaksi | Isi |
|---|---|---|---|
| **HP** (< 768px) | Tab bar kaca mengambang di bawah (4 tab) + tombol + kaca terpisah di kanan. Bar judul ringkas kaca muncul di atas setelah header tergulir keluar | Sheet dari bawah | Satu kolom |
| **iPad portrait** (768–1023px) | Tab bar kaca mengambang di atas tengah, ikon dan label sebaris (gaya iPadOS). Tombol + kaca di kanan bawah | Dialog di tengah (form sheet), 480px | Statistik dan grup akun 2 kolom, Lainnya maks 620px |
| **iPad landscape kecil** (1024–1179px) | Tab bar kaca di atas | Kartu **Catat cepat** selalu terbuka di kolom kanan (360px). Tombol + disembunyikan | Daftar transaksi kiri, kolom kanan: Catat cepat + Pengeluaran teratas |
| **Desktop** dan iPad Air/Pro landscape (≥ 1180px) | Sidebar gradien opnamix 232px: logo + nama buku, tombol "Catat transaksi" dengan `N`, menu, pilihan tema, profil. Bar judul ringkas kaca di atas area isi | Kartu Catat cepat di kolom kanan (380px), pintasan keyboard `N` | Konten maks 1120px di tengah |

## Constraints
### Must
- **Tema opnamix**: latar `--background`, kartu putih bergaris `--border`
  radius 14px dengan `--shadow-card`, kontrol radius 8–10px, font **DM Sans**
  (angka `tabular-nums`), DM Mono hanya untuk contoh format ketikan
- **Kepala halaman** memakai pita gradien `--grad-hero` dengan garis vertikal
  tipis (`--grad-stripe`), teks putih, chip statistik kaca (`StatChip`), dan
  `SegmentedControl` varian kaca. Bukan judul besar gaya iOS
- **Warna nominal** mengikuti `SignedValue` opnamix: pemasukan biru
  (`--primary-accent`), pengeluaran merah (`--bad`), transfer abu-abu
- **Ikon kategori** dari `@lucide/vue` di dalam kotak warna lembut (`ToneIcon`),
  warna dari palet grafik `--r1`…`--r6`. Emoji kategori dari data Realbyte
  tidak ditampilkan sebagai ikon
- **Liquid Glass hanya di**: tab bar, tombol +, bar judul ringkas. Resepnya:
  `backdrop-filter: blur(16px) saturate(180%)`, isi semi transparan, tepi
  berkilau lewat gradien + mask, kilau radial di atas. Tanpa filter SVG
  (refraksi SVG membuat Chromium menggambar halaman berulang)
- **Gerak (emil-design-eng)**:
  - Tekan: `scale(0.97)` 160ms `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`),
    ikon `scale(0.92)`
  - Pindah tab **tanpa animasi** (dipakai puluhan kali sehari). Bar judul
    ringkas menyesuaikan seketika saat pindah tab, memudar hanya saat menggulir
  - Lensa tab bar 220ms `--ease-drawer` (`cubic-bezier(0.32, 0.72, 0, 1)`)
  - Sheet HP: masuk 280ms, keluar 200ms (`--ease-drawer`). Dialog iPad: masuk
    240ms dari `scale(0.98)` + opacity, keluar 150ms. Keluar selalu lebih cepat
  - Aksi keyboard (`N`, `Esc`) tanpa animasi
  - Toast masuk lewat `@starting-style`, keluar 160ms, timer berhenti saat tab
    browser tersembunyi
  - Sorotan transaksi baru lewat WAAPI (`element.animate`), bukan transisi warna
    permanen di baris (yang ikut beranimasi saat tema diganti)
  - Stagger 40ms hanya saat app pertama dibuka
  - Hanya `transform` dan `opacity` yang dianimasikan, semua di bawah 300ms
    kecuali sorotan
- **Gestur (HP)**:
  - Sheet: drag 1:1 dari grabber/area kosong, gesekan `√` saat ditarik ke atas,
    tutup kalau turun > 30% tinggi atau velocity > 0,11 px/ms
  - Baris transaksi: geser kiri untuk hapus (ambang arah 10px, gesekan 0,15 ke
    kanan, hapus kalau > 45% lebar atau flick), lalu toast **Urungkan**
  - `setPointerCapture` setelah arah jelas, abaikan jari kedua
- **Satu logika form catat transaksi** untuk ketiga bentuk (sheet, dialog,
  inline). Mode inline: setelah simpan, isian dikosongkan dan fokus tetap
- **Hover hanya di `@media (hover: hover) and (pointer: fine)`**
- **Aksesibilitas**: `prefers-reduced-motion` (sheet/dialog jadi fade, tanpa
  transform), `prefers-reduced-transparency` (kaca jadi solid), target sentuh
  ≥ 44px di HP, input 16px (iOS tidak memperbesar halaman), safe area di semua
  sisi, `aria-pressed`/`aria-selected` di segmented dan tab
- Label bahasa Indonesia yang spesifik ("Transaksi", "Akun", "Catat cepat")

### Must Not
- Dialog konfirmasi untuk aksi yang bisa di-undo (hapus transaksi pakai toast)
- Warna, radius, bayangan, atau durasi yang ditulis langsung di komponen.
  Semuanya lewat token
- Kaca di permukaan selain tiga yang disebut di atas
- Library animasi tambahan. CSS transition + WAAPI sudah cukup

### Out of Scope
- Data asli dari Supabase (fase 4). Prototipe memakai mock
- Grafik final dan budget asli (fase 7)
- Logo/ikon app final (bisa dikerjakan terpisah)

## Current State
- Relevant files:
  - `design/prototype.html`, `design/preview.html` (acuan)
  - `app/assets/css/main.css`: token sementara fase 1 (palet iOS), diganti
  - `app/components/ui/button`: shadcn-vue `Button`, variannya diganti varian
    opnamix (`default`, `secondary`, `soft`, `ghost`, `ghost-danger`, `light`,
    `glass`)
  - `app/pages/login.vue`: memakai token sementara, ikut dirapikan
- Existing patterns:
  - Opnamix memakai Tailwind 3 dengan kanal RGB (`37 99 235`). Di sini Tailwind
    4: token CSS biasa di `@theme`, opasitas lewat `color-mix`
  - Fungsi `parseQuick` di prototipe dipindah ke fase 6 T1 sebagai
    `app/features/quick-add/parser.ts`. Di fase ini cukup dipakai apa adanya
    untuk layar prototipe

## Tasks

### T1: Token
**What:** Pindahkan token dari `design/prototype.html` (yang berasal dari
opnamix) ke `@theme` Tailwind 4, untuk `:root` dan `[data-theme='dark']`:
warna permukaan, teks, primer, status (`ok`/`warn`/`bad` + `-soft`), palet
`r1`–`r6`, gradien `grad-hero` dan `grad-side`, token kaca opnamix (`glass`,
`glass-2`, `glass-line`, `on-grad-*`), token Liquid Glass (`lg-*`), bayangan,
radius, dan kurva gerak (`ease-out`, `ease-in-out`, `ease-drawer`). Font DM Sans
dan DM Mono di-host sendiri lewat `@nuxt/fonts`. Tema: Terang / Gelap /
Sistem, disimpan per perangkat, `theme-color` ikut berubah.
**Files:** `app/assets/css/tokens.css`, `app/assets/css/main.css`,
`nuxt.config.ts`, `app/composables/useTheme.ts`
**Verify:** Halaman `/prototype/tokens` menampilkan semua token di kedua tema
dan cocok dengan prototipe. Ganti tema tidak berkedip.

### T2: Kerangka responsif
**What:** Layout `default.vue` dengan tiga mode sesuai tabel di atas:
- `AppSidebar` (≥ 1180px), port dari `opnamix/.../Sidebar.tsx` (versi selalu
  terbuka, tanpa mode rel/pin)
- `TabBar` kaca: bawah di HP, atas tengah di iPad, tersembunyi di desktop.
  Lensa meluncur ke tab aktif. Tap tab aktif = gulir ke atas
- `AddButton` kaca (HP dan iPad portrait)
- `CompactTopBar` kaca: muncul setelah `PageHeader` tergulir keluar (HP dan
  desktop), berisi judul halaman dan angka ringkas, tombol ke atas
- Breakpoint di satu tempat (`md` 768, `lg` 1024, `xl` 1180) dan composable
  `useBreakpoint`
**Files:** `app/layouts/default.vue`, `app/components/layout/*`,
`app/composables/useBreakpoint.ts`
**Verify:** Di `design/preview.html` dan di Nuxt dengan ukuran 393×852,
820×1180, 1133×744, 1440×900: posisi navigasi sama dengan prototipe. Tab bar
tidak tertutup home indicator di iPhone asli.

### T3: Komponen dasar
**What:** Port komponen opnamix ke Vue, dengan tampilan sama seperti prototipe:
`PageHeader` (+ slot hero dan progres), `StatChip`, `SegmentedControl`
(`plain` dan `on-grad`), `Card`, `GroupedList`, `TransactionRow` (geser untuk
hapus), `ToneIcon`, `KpiStrip`, `Meter`, `CompositionBar`, `HBarList`,
`SettingRow`, `ChoiceChip`, varian `Button` opnamix, `Toast` (dengan
Urungkan), `EmptyState`, `Skeleton`. Composable gestur kecil yang dipakai
bersama: `useSwipe` (arah, ambang, velocity, pointer capture).
**Files:** `app/components/ui/*`, `app/components/money/*`,
`app/composables/useSwipe.ts`, `app/composables/useToast.ts`
**Verify:** Halaman `/prototype/ui` menampilkan semua komponen dalam semua state
(normal, ditekan, nonaktif, kosong, memuat) di kedua tema.

### T4: Panel catat transaksi
**What:** `QuickAddPanel` (segmented jenis, nominal besar, input "Ketik saja",
chip akun/kategori/tanggal/catatan, mode keypad, baris template, Simpan dan
Simpan & lagi) dengan tiga pembungkus:
- `BottomSheet` (HP): drag, gesekan, flick, fokus terkunci, `Esc`
- `CenterDialog` (iPad portrait)
- inline di kolom kanan Transaksi (≥ 1024px), dengan pintasan `N` dari mana
  saja dan tombol "Catat transaksi" di sidebar

Pindah ukuran layar saat panel terbuka tidak kehilangan isian.
**Files:** `app/components/money/QuickAddPanel.vue`,
`app/components/ui/BottomSheet.vue`, `app/components/ui/CenterDialog.vue`
**Verify:** Di HP: tombol + → ketik `kopi 25rb gopay` → Enter tersimpan
(1 tap + ketik). Flick ke bawah menutup sheet. Di desktop: tekan `N` → ketik →
Enter, fokus tetap di input untuk transaksi berikutnya.

### T5: Layar prototipe di Nuxt
**What:** Pindahkan empat layar prototipe (Transaksi dengan Harian/Kalender/
Bulanan, Statistik, Akun, Lainnya) ke halaman Nuxt memakai komponen T2–T4 dan
data tiruan yang sama.
**Files:** `app/pages/prototype/*`, `app/mocks/*`
**Verify:** Tampilan dan perilaku sama dengan `design/prototype.html` di
keempat ukuran. Dibuka di iPhone dan iPad asli (via deploy Workers): catat
temuan di `.ai/specs/design-review.md`.

### T6: Pedoman desain
**What:** Ringkasan aturan untuk fase berikutnya: token mana untuk apa, di mana
kaca boleh dipakai, tabel gerak (durasi, kurva, kapan tanpa animasi), aturan
tata letak per ukuran, kapan sheet/dialog/inline, kapan dialog konfirmasi vs
Urungkan, dan checklist review layar (tema gelap, reduced motion, target
sentuh, safe area, hover, label).
**Files:** `.ai/conventions/design.md`
**Verify:** Checklist dipakai di review PR fase 4.
