# Fase R2: Navigasi dan Gestur

## Why
Rasa "app iOS" di mockup datang dari perilaku, bukan warna: halaman masuk dari
kanan, bisa digeser kembali dari tepi, daftar mengikuti jari saat pindah bulan.
Aplikasi sekarang pindah halaman tanpa animasi dan bulan baru berganti setelah
jari dilepas. Perilaku ini dipakai semua tab, jadi dibangun sekali di sini.

## What
1. Transisi push/pop antarhalaman dengan paralaks dan peredup.
2. Geser dari tepi kiri untuk kembali, ikut jari, diputuskan momentum.
3. Komponen daftar yang bisa digeser untuk pindah bulan.
4. Navigasi bulan di bar atas + lembar pemilih bulan/tahun.
5. Form dan modal masuk dari bawah.

## Constraints
### Must
- **Push/pop** (`playNav`, `App.dc.html` baris 1169–1194): halaman baru masuk
  dari `translateX(100%)`, halaman lama bergeser ke `-30%` dengan peredup
  `.navdim` (`rgba(0,0,0,.1)`), 350ms `--ease-drawer`. Pop kebalikannya. Halaman
  tanpa tab bar (form penuh) membawa tab bar ikut bergeser bersama halaman lama.
- **Pindah tab tanpa animasi.** Ketuk ulang tab Transaksi = kembali ke bulan
  dan hari ini.
- **Geser-kembali dari tepi** (`eDown/eMove/eUp` baris 1428–1481): mulai dalam
  24px dari tepi kiri, kunci arah setelah 10px, halaman atas mengikuti jari,
  jadi kalau `dx + project(v) > lebar/2`; durasi lanjutan
  `clamp(180, 2,25 × sisa / v, 400)` ms supaya menyambung kecepatan jari. Batal
  = kembali ke posisi dan state lama.
- **Geser daftar = pindah bulan** (`pDown/pMove/pUp` baris 1326–1380, `enter`
  1532–1548): konten 1:1, opacity turun sampai 0,55, petunjuk "‹ Sep" / "Nov ›"
  memudar masuk, rubber-band di batas bulan terakhir, keputusan dengan proyeksi
  momentum `v · 0,998 / 0,002` > 40% lebar. Bulan baru masuk dari ±44px 300ms.
  Hanya `.slide` (daftar) yang bergeser; strip ringkasan langsung berganti.
- Bar atas tab: tombol cari, `‹ Okt 2026 ›` (judul bisa diketuk), tombol filter.
  Lembar **Pilih bulan**: navigasi tahun, grid 12 bulan, "Kembali ke bulan ini".
- Form catat dan modal (Cari, Filter, Bookmark) masuk dari bawah 320ms
  `--ease-drawer`, keluar 200ms. Di iPad/desktop tetap dialog tengah gaya iOS.
- Reduce Motion: push/pop jadi fade 200ms, sheet jadi fade, geser tanpa
  animasi masuk.
- Hanya `transform` dan `opacity`; tidak ada re-render Vue per frame selama
  geser (tulis gaya langsung ke elemen).
### Must Not
- Jangan pakai `<Transition>` Vue biasa untuk push/pop kalau tidak bisa
  dikendalikan jari. Pola mockup: bekukan salinan DOM halaman lama
  (`freeze`/`thaw`), lalu animasikan salinan itu dan halaman baru.
- Geser horizontal di baris transaksi tidak dipakai (bertabrakan dengan pindah
  bulan). Hapus pakai tombol di form ubah + Urungkan.
### Out of Scope
- Isi tiap halaman (R3–R7).

## Current State
- Relevant files: `app/app.vue`, `app/layouts/app.vue`,
  `app/composables/useSwipe.ts`, `app/lib/gesture.ts`, `app/lib/navigation.ts`,
  `app/composables/useFormPage.ts`, `app/components/layout/{MonthPicker,PeriodNav,FormPage}.vue`.
- Existing patterns: `useSwipe` sudah mengunci arah 10px dan punya
  `shouldCommit` berbasis porsi + flick; bulan dipilih lewat state stats
  (`useStatsPeriod`).

## Tasks
### T1: Kedalaman rute dan arah navigasi
**What:** Tentukan kedalaman tiap rute (tab = 0, rincian = 1, sub-rincian = 2)
dan simpan arah push/pop dari `router.beforeEach` + `history.state`. Tombol
kembali di `NavBar` memanggil `router.back()` dengan fallback.
**Files:** `app/lib/navigation.ts`, `app/composables/useNavStack.ts` (baru)
**Verify:** unit test arah untuk tab→rincian, rincian→tab, tab→tab.

### T2: Transisi push/pop
**What:** Pasang pembeku DOM + WAAPI di sekitar `<NuxtPage>`; animasikan halaman
baru dan salinan lama sesuai arah; tab bar ikut bila halaman tujuan tanpa tab
bar. Simpan posisi gulir.
**Files:** `app/layouts/app.vue`, `app/composables/usePageTransition.ts` (baru)
**Verify:** Akun → BCA → kembali di browser pane HP; Reduce Motion.

### T3: Geser-kembali dari tepi
**What:** Gestur tepi di layout: jalankan kembali saat arah terkunci, halaman
mengikuti jari, selesaikan atau batalkan dengan momentum. iOS standalone: cegah
gestur kembali bawaan Safari bertabrakan (`overscroll-behavior-x: none`).
**Files:** `app/composables/useEdgeBack.ts` (baru), `app/layouts/app.vue`
**Verify:** iPhone asli mode standalone; lepas di 30% lambat = batal, lempar
cepat = jadi.

### T4: Daftar geser-bulan
**What:** Komponen `MonthSwipe` (viewport `.vp`, petunjuk kiri/kanan, `.track`,
`.slide`) yang memancarkan `shift(dir)` dan menjalankan animasi masuk setelah
data bulan baru siap. Ganti `useSwipe` lama di kepala halaman.
**Files:** `app/components/ios/MonthSwipe.vue`, `app/composables/useSwipe.ts`
**Verify:** geser lambat, lempar, rubber-band di batas, klik tidak terpicu
setelah geser (`swallow`).

### T5: Bar bulan dan pemilih bulan
**What:** `MonthNav` (`‹ judul ›`) untuk `NavBar`, lembar `MonthPickerSheet`
memakai `IosSheet`. Satu sumber bulan terpilih dipakai Transaksi, Statistik,
dan rincian akun.
**Files:** `app/components/ios/MonthNav.vue`, `MonthPickerSheet.vue`,
`app/features/stats/useStats.ts`
**Verify:** bulan yang dipilih di Transaksi terbawa ke rincian akun.

### T6: Form dan modal dari bawah
**What:** Ganti `FormPage`/`useFormPage` dengan lapisan modal layar penuh
(`.form`) di HP dan dialog di iPad/desktop. Rute form tetap ada supaya bisa
dibuka langsung dan tombol kembali Android/iOS menutupnya.
**Files:** `app/components/ios/ModalPage.vue`, `app/composables/useFormPage.ts`
**Verify:** buka/tutup form, tombol kembali browser, Esc di desktop tanpa
animasi.

### T7: Konvensi gerak
**What:** Ganti tabel Gerak, Gestur, dan Form di `.ai/conventions/design.md`.
**Files:** `.ai/conventions/design.md`
**Verify:** dibaca ulang terhadap mockup.
