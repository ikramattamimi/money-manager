# Fase R7: Lainnya, Pengaturan, Impor

## Why
Tab Lainnya berisi banyak layar lama (buku, profil, PIN, kategori, ulangi,
pintasan iOS, ekspor, impor) yang belum ada di mockup kecuali Lainnya,
Pengaturan transaksi, dan alur Impor. Semuanya harus terasa satu app.

## What
1. Lainnya dan Pengaturan transaksi sesuai layar `more`, `settings`.
2. Impor sesuai layar `import`, `import-realbyte*`, `import-balance`,
   `import-bank*`, `import-photo*`, `import-history`.
3. Layar lama lain digambar ulang dengan gaya mockup.

## Constraints
### Must
- **Lainnya**: judul besar, baris buku di atas (avatar, nama buku, anggota →
  kelola buku/undang), lalu grup: **Transaksi** (Pengaturan transaksi, Ulangi &
  cicilan, Bookmark), **Data** (Akun & grup akun, Total akun, Kategori, Budget),
  **Tampilan & keamanan** (Gaya & warna, Kode sandi/PIN, Pengingat harian),
  **Cadangan & impor** (Impor data, Riwayat impor, Backup & pulihkan, Ekspor
  Excel, Pintasan iOS, Bantuan), lalu Profil. Ikon solid berwarna per baris.
- Baris Tag, Mata uang, Ikon aplikasi & widget **tidak ditampilkan**.
- **Pengaturan transaksi** hanya berisi opsi yang sudah berfungsi (tanggal awal
  bulan dengan keterangan "Periode Okt = 25 Sep – 24 Okt", carry-over budget).
- **Impor**: hero, tiga sumber dengan ikon besar, Terakhir + Riwayat ›.
  Realbyte: pilih file → membaca (spinner) → pratinjau (KPI, akun baru dengan
  segmented jenis, kategori baru, baris dilewati yang bisa dibuka) → bar bawah
  Simpan → progres → selesai (centang digambar 380ms, `mmPop` + `mmDraw`) →
  **Cocokkan saldo**. Mutasi bank: segmented Bank/Foto, chip akun, area pilih
  PDF; pratinjau dengan tab Baru/Transfer/Ragu/Tercatat, ketuk baris = lembar
  kategori, **geser kiri = lewati** (baris ini boleh digeser karena tidak ada
  geser-bulan di sini). Foto struk: thumbnail, "Baca dengan AI" hanya setelah
  ditekan. Riwayat: Batalkan lewat `IosAlert` (tidak bisa diurungkan).
- Layar lama ikut gaya iOS: buku & undangan, profil (kata sandi, avatar), PIN
  (`LockScreen`), kategori (grid + urut seret), Ulangi & cicilan (daftar
  `recurring`), Bookmark (kelola `templates`), pintasan iOS, ekspor, halaman
  login, halaman undangan.
- **Gaya & warna**: Terang / Gelap / Sistem.
### Must Not
- Tidak mengubah server route impor (`server/api/import/**`).
### Out of Scope
- Backup JSON dan Web Push (R8). Opsi pengaturan baru (catatan fitur).

## Current State
- Relevant files: `app/pages/more.vue`, `app/pages/settings/**`,
  `app/pages/{login,invite/[token]}.vue`, `app/components/money/{StatementImport,BookForm,CategoryForm,RecurringForm,TemplateForm}.vue`,
  `app/components/base/LockScreen.vue`, `app/features/{import,books,profile,lock,categories,recurring,templates,export}/*`.
- Existing patterns: pratinjau impor dari `server/api/import/*/preview`, commit
  terpisah; impor bisa dibatalkan per batch.

## Tasks
### T1: Lainnya dan Pengaturan transaksi
**What:** `more.vue` gaya pengaturan iOS, halaman Pengaturan transaksi, Gaya &
warna.
**Files:** `app/pages/more.vue`, `app/pages/settings/{transactions,appearance}.vue`
**Verify:** semua baris membuka layar yang ada; tidak ada baris "Segera".

### T2: Hub impor dan Realbyte
**What:** Hub impor dan alur Realbyte lengkap dengan Cocokkan saldo.
**Files:** `app/pages/settings/import/{index,history,balances}.vue`,
`app/pages/settings/import/realbyte.vue` (pisah dari index bila perlu)
**Verify:** impor file contoh `.data`, batalkan dari Riwayat.

### T3: Mutasi bank dan foto struk
**What:** Alur bank/foto dengan tab status, lembar kategori, geser-lewati.
**Files:** `app/pages/settings/import/{bank,photo}.vue`, `app/components/money/StatementImport.vue`
**Verify:** PDF SeaBank dan Jago dari fixture; foto tidak terkirim sebelum
tombol AI.

### T4: Layar lama
**What:** Gambar ulang buku, profil, PIN, kategori, ulangi, bookmark, pintasan,
ekspor, login, undangan.
**Files:** `app/pages/settings/**`, `app/pages/{login,invite/[token]}.vue`
**Verify:** `design:design-critique` per layar terhadap gaya mockup; terang/gelap.
