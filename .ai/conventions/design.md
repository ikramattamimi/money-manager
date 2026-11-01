# Konvensi Desain

Acuan visual: mockup iOS di `design/ios/` (kanvas
https://claude.ai/artifact/1PuG9FdKyAr1W8FA4bpHcm), rencana di
`.ai/plans/redesign-ios/`. Token dan komponen ada di `app/`, katalognya di
`/prototype/ui` dan `/prototype/tokens`. Halaman yang belum digambar ulang
masih memakai komponen tema lama (`PageHeader`, kaca opnamix) sampai fasenya
(R3–R7); komponen itu dihapus di R8.

## Token

Semua warna, radius, bayangan, dan kurva gerak berasal dari
`app/assets/css/tokens.css`. Mode terang = nilai mockup (`ios.css` `.app`), mode
gelap = warna sistem iOS dark grouped dengan kontras teks ≥ 4,5:1. Jangan menulis
nilai literal di komponen atau halaman.

| Kebutuhan | Pakai |
|---|---|
| Latar halaman / kartu / grup | `bg-background` / `bg-card` |
| Garis pemisah | `var(--sep)` (0,5px, `shadow-[…_var(--sep)]` atau `::before`) |
| Isian chip, segmented, tombol abu / tekan baris | `bg-fill` / `bg-fill-2` / `active:bg-fill-press` |
| Teks utama / sekunder / meta | `text-foreground` / `text-muted-foreground` / `text-faint` |
| Placeholder, chevron | `text-ter`, `text-chevron` |
| Isi tombol utama | `bg-primary` + `text-primary-foreground` |
| Teks, ikon, fokus beraksen | `text-primary-accent` (lebih terang di mode gelap) |
| Latar lembut aksen | `bg-primary-soft` + `text-primary-accent` |
| Nominal | Pemasukan `text-inc`, pengeluaran `text-exp`, transfer `text-muted-foreground`. Angka sudah `tabular-nums` dari `body` |
| Status | `ok` / `warn` / `bad` (+ `-soft`) |
| Ikon kategori/akun/pengaturan | `ToneIcon` dengan nada. Database: `r1`–`r6`, `neutral` (dipetakan ke biru, oranye, hijau, kuning, merah muda, ungu, abu). Ikon sistem: nama iOS (`blue`, `teal`, `indigo`, …). `solid` = ikon putih di kotak berwarna seperti Pengaturan iOS |
| Papan angka, grid pilihan | `--kb-*` |

Font: `-apple-system, 'SF Pro Text', 'Inter'` (Inter di-host lewat
`@nuxt/fonts` untuk non-Apple). Skala teks iOS: `text-meta` 13px keterangan dan
judul grup, `text-body` 15px nominal baris, `text-row` 16px judul baris grup,
`text-bar` 17px judul bar dan tombol besar, `text-sheet` 19px judul lembar,
`text-large` 34px judul besar. Tracking negatif hanya untuk 15px ke atas.

## Komponen iOS (`app/components/ios/`)

| Komponen | Mockup | Catatan |
|---|---|---|
| `NavBar` | `.nav`/`.navrow` | `back` = label tombol kembali; slot `#right`, slot default untuk baris kedua (bulan, `SubTabs`); `large` untuk judul 34px |
| `IconButton` | `.ib` | 44px, `accent` untuk aksi utama bar, `label` wajib |
| `SubTabs` | `.subtabs` | Harian/Kalender/…, tanpa animasi |
| `SummaryStrip` | `.strip` | 3 kolom dengan nada `inc`/`exp` |
| `GroupedList` + `GroupRow` | `.grp`/`.row`/`.sh` | Baris jadi tautan (`to`), tombol (`@click`), atau div. Slot `#icon`, `#value`, `#end` (saklar) |
| `Segmented`, `Chip`, `IosButton`, `IosSwitch`, `EmptyCard` | `.seg`, `.chip`, `.btn`, `.sw`, `.empty` | |
| `IosSheet` | `.sheet` | Lembar melayang, tarik turun dengan momentum |
| `Dock` | `.dock` | Panel bawah gaya keyboard untuk papan angka/grid |
| `IosAlert` + `useAlert().confirm()` | `.ialert` | Hanya untuk aksi yang tidak bisa diurungkan |
| `Toaster` + `useToast()` | `.toast` | Toast kaca gelap di atas, dengan Urungkan |

## Kaca

**Liquid Glass hanya di lapisan yang melayang**: tab bar, menu tahan tombol +,
toast, dialog peringatan, dan bar aksi bawah. Token `--glass-bar*`,
`--glass-menu*`, `--toast-bg`, `--alert-bg`. Bar navigasi, kartu, lembar, dan
form solid. `prefers-reduced-transparency` → solid. Kaca opnamix (`bg-glass*`,
`.lg`) hanya untuk halaman lama.

## Tata letak

| Ukuran | Navigasi | Catat transaksi |
|---|---|---|
| HP < 768px | `TabBar` bawah + `AddButton` di kanannya (semua tab; tahan = menu catat cepat) | Halaman `/transaction` (lihat Form) |
| iPad 768–1023px | `TabBar` atas tengah + `AddButton` kanan bawah | `CenterDialog` |
| iPad landscape 1024–1179px | `TabBar` atas tengah | Inline di kolom kanan Transaksi |
| Desktop ≥ 1180px | `AppSidebar` | Inline + pintasan `N` |

- Breakpoint di `useBreakpoint()` dan Tailwind `md`/`lg`/`xl` (768/1024/1180).
- Halaman digulir oleh window. Konten maks 1120px di tengah (`AppShell`).
- Setiap halaman diawali `PageHeader`. Bar judul ringkas muncul otomatis saat
  pita tergulir keluar; isi `summary` dengan angka terpenting halaman.
- Target sentuh ≥ 44px di HP (tombol `size="touch"`), input 16px.

## Form

- **HP (< 768px): form selalu halaman penuh yang masuk dari bawah** (mockup
  `.form`). Bungkus dengan `FormPage` (bar atas "Batal" + judul + slot
  `#action`, `layout: false`); plugin `page-transition` menganimasikannya naik
  320ms dan turun 200ms. Form diberi prop `page` (atau `layout="page"`) supaya
  judulnya disembunyikan dan tombol aksinya menempel di bawah
  (`.form-page-actions`). Halaman `layout: false` dianggap form, kecuali
  `/invite`.
- **iPad dan desktop:** form tampil sebagai dialog (`Overlay` / `CenterDialog`).
- Pembuka form memanggil `useFormPage().openAsPage(path)`: di HP pindah ke
  halaman dan mengembalikan `true`; selain itu `false` dan pemanggil membuka
  dialog. Halaman form menutup dengan `closePage(fallback)` (kembali ke layar
  sebelumnya, atau `fallback` kalau dibuka langsung).
- Rute halaman form: `/transaction`, `/accounts/new`, `/accounts/[id]/edit`,
  `/accounts/[id]/adjust`, `/settings/categories/new?kind=`,
  `/settings/categories/[id]`. Form baru mengikuti pola yang sama.
- Pilihan kategori dan akun memakai `GridPicker` (grid 3 kolom gaya Realbyte:
  sel induk membuka anaknya di bawah barisnya). Di halaman HP grid menempel di
  bawah layar seperti keyboard; di dialog tampil di dalam form.
- Isian teks tetap 16px (iOS tidak memperbesar halaman). Kolom tanggal memakai
  `.field-input` yang sudah menangani lebar minimum bawaan iOS.

## Gerak

| Hal | Aturan |
|---|---|
| Tekan | `.press` (`scale(0.97)`, 160ms ease-out), ikon `.press-icon` / tombol bar `0.9`, tab `0.93` |
| Pindah tab | Tanpa animasi. Ketuk tab aktif = gulir ke atas |
| Masuk halaman rincian (HP) | Push: halaman baru dari kanan, lama ke −30% di bawah peredup, 350ms `--ease-drawer`. Kembali = pop (kebalikannya). Plugin `page-transition`, otomatis untuk semua rute |
| Form (HP) | Naik dari bawah 320ms, turun 200ms |
| iPad / desktop | Pindah halaman tanpa animasi |
| Aksi keyboard (`N`, `Esc`, Enter) | Tanpa animasi |
| Lembar (`IosSheet`) | Masuk 320ms, keluar 200ms (atau menyambung kecepatan jari), `--ease-drawer` |
| Panel dock | Muncul pertama 280ms; ganti isi tanpa animasi |
| Ganti bulan (`MonthSwipe`) | Ikut jari; bulan baru masuk dari ±44px 300ms |
| Menu tahan tombol + | 200ms skala 0,95 + opacity dari pojok tombol, keluar 150ms |
| Dialog peringatan | Masuk dari `scale(1.08)` + opacity 220ms |
| Toast | Turun dari atas lewat `@starting-style` 300ms, naik keluar 160ms |
| Sorotan baris baru | WAAPI `element.animate`, bukan transisi warna permanen |
| Muncul bertahap | `.stagger`, hanya saat app pertama dibuka |

- Hanya `transform` dan `opacity` yang dianimasikan, di bawah 300ms.
- Masuk/keluar pakai `ease-out` (`--ease-out`), gerak di layar pakai
  `--ease-in-out`. Jangan `ease-in`.
- Hover hanya untuk pointer presisi (varian `hover:` Tailwind 4 sudah
  dibatasi `@media (hover: hover)`).
- `prefers-reduced-motion`: sheet/dialog jadi fade, animasi keyframe mati.
  `prefers-reduced-transparency`: Liquid Glass jadi solid.

## Gestur

Pakai fungsi di `app/lib/gesture.ts` (`project`, `rubber`,
`createVelocityTracker`) dan pola mockup (apple-design):

- Arah dikunci setelah 10px; gerak di sumbu lain dilepas ke scroll.
- Konten bergerak 1:1 dengan jari; tulis `transform` langsung ke elemen,
  jangan lewat state Vue per frame.
- Keputusan lepas memakai **proyeksi momentum**: `posisi + project(v)` melewati
  porsi ukuran (lembar 35%, ganti bulan 40%, geser-kembali 50%). Jari yang
  berbalik arah saat dilepas = batal.
- Animasi lanjutan menyambung kecepatan jari (durasi dari sisa jarak ÷
  kecepatan, dibatasi), bukan durasi tetap.
- Batas memakai `rubber()`, bukan berhenti mendadak.
- **Geser horizontal di daftar = pindah bulan** (`MonthSwipe`), jadi baris
  transaksi tidak digeser-hapus di HP; hapus lewat form ubah + Urungkan.
- **Geser dari tepi kiri (24px) = kembali** di halaman rincian (bukan tab
  utama dan bukan form). Komponen lain mengabaikan pointer yang mulai di
  24px kiri.
- `useSwipe` lama tetap untuk komponen yang belum diganti (sheet lama, baris).

## Konfirmasi vs Urungkan

- Aksi yang bisa dibatalkan (hapus transaksi, hapus template): langsung jalan,
  lalu toast dengan **Urungkan** (`useToast().show(text, undo)`).
- Dialog konfirmasi hanya untuk yang tidak bisa dibatalkan: hapus akun beserta
  transaksinya, batalkan impor, hapus buku.

## Checklist review layar

- [ ] Mode terang dan gelap, tanpa warna literal
- [ ] HP, iPad portrait, iPad landscape, desktop sesuai tabel tata letak
- [ ] Form di HP berupa halaman (`FormPage`), bukan modal
- [ ] Tekan terasa (`.press`), target sentuh ≥ 44px di HP
- [ ] Tidak ada animasi saat pindah halaman atau aksi keyboard
- [ ] Reduce Motion dan Reduce Transparency diuji
- [ ] Safe area (notch, home indicator) di iPhone mode standalone
- [ ] Label bahasa Indonesia yang spesifik; nominal `tabular-nums`
- [ ] Hapus pakai Urungkan, bukan dialog
