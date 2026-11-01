# Rencana Redesign iOS

Menerapkan mockup **Money Manager Redesign** (gaya iOS, alur Realbyte) ke
aplikasi. Mockup menggantikan tema opnamix (pita gradien, DM Sans) dari
`.ai/plans/mvp/fase-3-design.md`.

Tiap fase punya spec sendiri dengan format `.ai/templates/spec.md`.

## Acuan

| Sumber | Isi |
|---|---|
| Kanvas mockup: https://claude.ai/artifact/1PuG9FdKyAr1W8FA4bpHcm | Prototipe interaktif (tekan Play di artboard `Main`) dan papan per tab |
| `design/ios/App.dc.html` | Salinan sumber mockup: **semua layar, perilaku, gestur, dan durasi animasi**. Markup di baris 1–814, logika di `class Component` (gestur di `bindGestures`, navigasi di `navSnap`/`playNav`/`setEdge`) |
| `design/ios/ios.css` | Token dan kelas komponen mockup (`.nav`, `.grp`, `.row`, `.sh`, `.strip`, `.subtabs`, `.dock`, `.keys`, `.sheet`, `.tabbar`, `.fab`, `.toast`, `.ialert`) |
| `design/ios/Gaps.dc.html` | Daftar perbedaan aplikasi lama dengan Realbyte (30 Okt 2026) |
| `design/ios/*.dc.html` lain | Papan per tab, keterangan tiap layar di `phones[].desc` |

Untuk melihat satu layar: buka kanvas, pilih artboard `Main`, ubah tweak
`screen`. Nama layar ada di `data-props` baris 815 `App.dc.html`.

## Keputusan (1 Nov 2026)

| Topik | Keputusan |
|---|---|
| Fitur lama yang tidak ada di mockup | Tetap ada, digambar ulang dengan gaya mockup (baris grup iOS, bar navigasi, sheet) |
| Mode gelap | Wajib. Mockup hanya terang, jadi token gelap diturunkan dari warna sistem iOS (lihat Fase R1) |
| Perilaku | Ikuti mockup: push/pop halaman dengan geser-kembali dari tepi, geser daftar = pindah bulan, panel bawah untuk papan angka/kategori/akun/tanggal, lembar bisa ditarik turun |
| Template | **Jadi Bookmark.** Tabel `templates` tetap, nama di UI jadi Bookmark. Bintang di form = simpan bookmark |
| Quick-add teks bebas | Pindah ke menu **tahan tombol +** sebagai "Ketik cepat", sejajar Dari bookmark / Mutasi bank / Foto struk |
| Tag, foto lampiran, tanda (!), memo harian | **Belum dibangun.** Masuk [Catatan fitur](#catatan-fitur). Baris-barisnya tidak ditampilkan di form |
| Batas PWA iOS | Widget dan ganti ikon dilewati. Kode sandi tetap PIN. Backup = unduh/pulihkan file. Pengingat harian lewat Web Push |
| iPad dan desktop | Tata letak responsif dipertahankan (tab bar atas, sidebar, dialog, kolom kanan), tampilannya ikut gaya iOS |
| Pilih banyak | **Tahan lama baris** transaksi untuk masuk mode pilih, bar aksi di bawah |
| Periode statistik | Lembar pilihan mockup dengan 4 periode yang sudah jalan (Mingguan, Bulanan, Tahunan, Periode). Daftar dan Tren masuk catatan fitur |
| Pengaturan transaksi | Hanya opsi yang sudah berfungsi. Opsi baru lain masuk catatan fitur |

## Fase

| Fase | Spec | Inti |
|---|---|---|
| R1 | [fase-r1-fondasi.md](fase-r1-fondasi.md) | Token iOS terang/gelap, font, komponen dasar, tab bar, tombol + dengan menu tahan |
| R2 | [fase-r2-navigasi-gestur.md](fase-r2-navigasi-gestur.md) | Push/pop halaman, geser-kembali dari tepi, geser = pindah bulan, pemilih bulan, lembar tarik-turun |
| R3 | [fase-r3-transaksi.md](fase-r3-transaksi.md) | Tab Transaksi: Harian, Kalender, Mingguan, Bulanan, Ringkasan, cari, filter, bookmark, pilih banyak |
| R4 | [fase-r4-catat.md](fase-r4-catat.md) | Form catat: kalkulator, alur otomatis, panel tanggal, ulangi/cicilan, transfer, salin, ketik cepat |
| R5 | [fase-r5-statistik-budget.md](fase-r5-statistik-budget.md) | Statistik donat, Budget, Atur budget, rincian budget/kategori, statistik per catatan |
| R6 | [fase-r6-akun.md](fase-r6-akun.md) | Akun, rincian akun per bulan, kartu kredit, total akun |
| R7 | [fase-r7-lainnya-impor.md](fase-r7-lainnya-impor.md) | Lainnya, pengaturan, impor (Realbyte, mutasi, struk, riwayat), layar lama lain |
| R8 | [fase-r8-pwa-rapikan.md](fase-r8-pwa-rapikan.md) | Pengganti fitur native (backup, Web Push), hapus sisa tema lama, uji akhir |

## Urutan dan ketergantungan

```
R1 ──> R2 ──┬──> R3 ──> R4
            ├──> R5
            ├──> R6
            └──> R7 ──────────> R8 (setelah semua)
```

- **R1 dan R2 berurutan dan sendirian.** Semua layar memakai komponen R1 dan
  kerangka navigasi R2.
- **R3, R5, R6, R7 bisa paralel** setelah R2: folder halaman berbeda
  (`pages/index`, `pages/stats`, `pages/accounts`, `pages/more` + `settings`).
  Komponen baru yang dipakai bersama masuk ke R1 dulu, jangan dibuat di dua
  cabang.
- **R4 setelah R3**: form dibuka dari kepala tanggal, kalender, dan menu tombol +
  yang dibuat di R3.
- Satu fase = satu branch dan satu PR, seperti aturan MVP.

## Skill yang dipakai

Skill dimuat dengan tool `Skill` sebelum mengerjakan task yang cocok.

| Skill | Dipakai untuk | Fase |
|---|---|---|
| `apple-design` | Wajib. Bahan, kedalaman, tipografi iOS, spring/momentum, gestur 1:1, Reduce Motion/Transparency | Semua, terutama R1, R2, R4 |
| `emil-design-eng` | Wajib. Detail polesan, kapan animasi, kurva dan durasi, tekan terasa | Semua |
| `animate` | Membangun tiap animasi baru (push/pop, panel dock, pill jenis transaksi, centang impor) | R2, R4, R7 |
| `animation-performance` | Gestur 60fps: hanya `transform`/`opacity`, blur kaca, re-render Vue per frame | R2, R3 |
| `mobile-native` | Safe area, `100dvh`, input 16px, tap highlight, pull-to-refresh, long-press tanpa seleksi teks, status bar PWA | R1, R2, R3, R8 |
| `animation-vocabulary` | Menamai efek mockup saat menulis spec/prompt | Perencanaan |
| `find-animation-opportunities` | Cari layar lama yang belum punya gerak setelah digambar ulang | R7, R8 |
| `remove-animations` | Buang gerak di aksi keyboard dan pindah tab yang tidak perlu | R8 |
| `improve-animations` | Audit gerak seluruh app sebelum rilis | R8 |
| `dataviz` | Donat statistik, grafik budget, batang 6 bulan, sparkline aset, warna terang/gelap | R3 (Ringkasan), R5, R6 |
| `design:design-system` | Menyusun token iOS dan katalog komponen, cek nilai literal | R1, R8 |
| `design:accessibility-review` | Kontras token gelap, target sentuh 44px, label tombol ikon, urutan fokus sheet | R1, R8 |
| `design:ux-copy` | Label, keadaan kosong, toast, dialog konfirmasi | R3–R7 |
| `anthropic-skills:indonesia-eyd-writing-skill` | Ejaan teks UI dan spec bahasa Indonesia | Semua |
| `design:design-critique` | Bandingkan hasil layar dengan mockup tiap akhir fase | Akhir tiap fase |
| `break-ui` | Uji nama akun/kategori panjang, nominal triliunan, bulan kosong | R3, R5, R6 |
| `anthropic-skills:built-in-browser` + `run` | Jalankan `dev` dan cek layar di browser pane (HP 375px, iPad, desktop, gelap) | Verifikasi tiap task |
| `code-review`, `simplify` | Review diff sebelum PR | Akhir tiap fase |

Skill `review-animations` dan `prototype` ada di `~/.claude/skills` tapi tidak
terdaftar di sesi ini; aktifkan dulu kalau mau dipakai untuk review gerak.

## Aturan kerja

- Aturan MVP tetap berlaku: lolos `pnpm build`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test`; uji di iPhone asli mode standalone.
- Nilai warna, durasi, dan kurva hanya dari token R1. Durasi dan kurva disalin
  dari mockup, bukan ditebak.
- `.ai/conventions/design.md` diperbarui di R1 (token, komponen) dan R2
  (gerak, gestur, form). Aturan lama "pindah halaman tanpa animasi" dan "form
  HP = halaman `FormPage`" diganti perilaku mockup.
- Data dan API (`app/features/*`) dipakai ulang. Fase ini mengganti tampilan dan
  perilaku, bukan model data, kecuali RPC baca yang disebut di spec.

## Catatan fitur

Ada di mockup tapi sengaja ditunda. Kerjakan sebagai rencana terpisah.

| Fitur | Butuh |
|---|---|
| Tag per transaksi (form, cari, filter) | Tabel `tags` + relasi transaksi |
| Foto lampiran transaksi (maks. 3) | Supabase Storage + kolom/relasi foto |
| Tanda (!) di transaksi dan daftar | Kolom `flagged` |
| Memo harian (kuning di Harian, titik di Kalender, lembar Memo) | Tabel memo per tanggal per buku |
| Periode statistik Daftar dan Tren | RPC dan layar baru |
| Pengaturan: awal minggu, layar awal, input jam, matikan isi otomatis catatan, tampilkan tanda, geser layar = pindah tab, waktu pengeluaran kartu kredit, kapan ulangi muncul, warna masuk/keluar | Kolom preferensi di `profiles`/`books` |
| Budget per satu bulan saja (tanpa mengubah bulan berikutnya) | Cek model `budgets.start_on`; kemungkinan kolom `end_on` atau baris override |
| Mata uang selain IDR | Kolom mata uang per buku/akun |
| Face ID | WebAuthn (passkey) sebagai pengganti PIN |
| Widget layar utama, ganti ikon aplikasi | Tidak bisa di PWA iOS |
