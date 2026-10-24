# Konvensi Desain

Berlaku mulai fase 4. Acuan visual: `design/prototype.html` (pratinjau tiga
perangkat: `design/preview.html`). Komponen dan token ada di `app/`, katalognya
di `/prototype/ui` dan `/prototype/tokens`.

## Token

Semua warna, radius, bayangan, dan kurva gerak berasal dari
`app/assets/css/tokens.css` (disalin dari design system Opnamix). Jangan menulis
nilai literal di komponen atau halaman.

| Kebutuhan | Pakai |
|---|---|
| Latar halaman / kartu / isian sekunder | `bg-background` / `bg-card` / `bg-surface-2` |
| Teks utama / sekunder / meta | `text-foreground` / `text-muted-foreground` / `text-faint` |
| Isi tombol utama | `bg-primary` + `text-primary-foreground` |
| Teks, ikon, fokus berwarna primer | `text-primary-accent` (lebih terang di mode gelap) |
| Latar lembut aksi sekunder | `bg-primary-soft` + `text-primary-ink` |
| Status | `ok` / `warn` / `bad` (+ `-soft` untuk latar) |
| Kategori dan grafik | `r1`–`r6`, lewat `ToneIcon` / `TONE_FILL` |
| Di atas pita gradien | `text-on-grad*`, `bg-glass*`, `border-glass-line` |
| Nominal | Pemasukan `text-primary-accent`, pengeluaran `text-bad`, transfer `text-muted-foreground`. Selalu `tabular-nums` |

Teks memakai skala Opnamix: `text-2xs` (11px label grup), `text-xs` (12px),
`text-meta` (13px), `text-label` (13,5px judul baris), `text-panel` (15,5px
judul kartu). Angka utama 30px (34px di iPad ke atas).

## Kaca

Ada dua jenis kaca, jangan dicampur:

- **Kaca Opnamix** (`bg-glass`, `bg-glass-2`, `border-glass-line`): hanya di atas
  pita gradien `PageHeader` dan sidebar. Untuk chip, tombol kepala halaman, dan
  segmented varian `on-grad`.
- **Liquid Glass** (kelas `.lg`, `.lg-tint`): **hanya** tab bar, tombol +, dan
  bar judul ringkas. Permukaan lain (kartu, sheet, dialog, toast) solid.

## Tata letak

| Ukuran | Navigasi | Catat transaksi |
|---|---|---|
| HP < 768px | `TabBar` bawah + `AddButton` | Halaman `/transaction` (lihat Form) |
| iPad 768–1023px | `TabBar` atas tengah + `AddButton` | `CenterDialog` |
| iPad landscape 1024–1179px | `TabBar` atas tengah | Inline di kolom kanan Transaksi |
| Desktop ≥ 1180px | `AppSidebar` | Inline + pintasan `N` |

- Breakpoint di `useBreakpoint()` dan Tailwind `md`/`lg`/`xl` (768/1024/1180).
- Halaman digulir oleh window. Konten maks 1120px di tengah (`AppShell`).
- Setiap halaman diawali `PageHeader`. Bar judul ringkas muncul otomatis saat
  pita tergulir keluar; isi `summary` dengan angka terpenting halaman.
- Target sentuh ≥ 44px di HP (tombol `size="touch"`), input 16px.

## Form

- **HP (< 768px): form selalu halaman penuh, bukan modal/sheet.** Bungkus
  dengan `FormPage` (bar atas "‹ Kembali" + judul, `layout: false`), form diberi
  prop `page` (atau `layout="page"`) supaya judulnya disembunyikan dan tombol
  aksinya menempel di bawah (`.form-page-actions`).
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
| Tekan | `.press` (`scale(0.97)`, 160ms ease-out), ikon `.press-icon` (`0.92`) |
| Pindah tab / halaman | Tanpa animasi |
| Aksi keyboard (`N`, `Esc`, Enter) | Tanpa animasi |
| Lensa tab bar | 220ms `--ease-drawer` |
| Sheet, grid pilihan di HP | Masuk 280ms, keluar 200ms, `--ease-drawer` |
| Dialog | Masuk 240ms dari `scale(0.98)` + opacity, keluar 150ms |
| Toast | Masuk lewat `@starting-style`, keluar 160ms |
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

Pakai `useSwipe` dan fungsi di `app/lib/gesture.ts`:

- Arah dikunci setelah 10px; gerak di sumbu lain dilepas ke scroll.
- Aksi jalan kalau melewati porsi ukuran (sheet 30%, baris 45%) **atau**
  di-flick (> 0,11 px/ms).
- Batas tanpa aksi pakai gesekan (`linearFriction`, `sqrtFriction`), bukan
  berhenti mendadak.

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
