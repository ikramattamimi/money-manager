# Fase 6: Input Cepat

## Why
Ini keluhan #1: input manual lambat, jadi gampang ketinggalan seminggu lalu
makan waktu lama untuk dikejar. Di form biasa, satu transaksi butuh memilih
jenis, mengetik nominal, memilih akun, memilih kategori, lalu simpan. Banyak
transaksi user ternyata berulang (Spotify per orang, langganan, kos, rokok,
bensin), dan polanya sudah terlihat dari data Realbyte.

## What
1. Quick-add: satu baris teks seperti `kopi 25rb gopay` langsung jadi
   transaksi.
2. Template (bookmark Realbyte): satu tap jadi transaksi.
3. Transaksi berulang yang otomatis tercatat.
4. Shortcut iOS untuk membuka quick-add langsung.

## Constraints
### Must
- Parser quick-add berjalan di client (instan, tanpa jaringan) dan ditest
- Saran kategori dan akun berasal dari riwayat buku itu sendiri (RPC
  `suggest_from_note`), bukan aturan yang ditulis tangan
- Sebelum disimpan, hasil parsing selalu ditampilkan sebagai chip yang bisa
  diubah dengan satu tap
- Quick-add yang tidak dipahami tetap bisa disimpan: buka form lengkap dengan
  isian yang sudah terbaca
- Transaksi berulang dibuat oleh `pg_cron` di database, tidak bergantung pada
  app dibuka

### Must Not
- Memanggil AI untuk quick-add di fase ini (fase 10)
- Menyimpan transaksi tanpa nominal yang jelas

### Out of Scope
- Foto struk (fase 10)
- Mutasi bank (fase 8)

## Current State
- Relevant files:
  - Form transaksi dan sheet dari fase 4 T3
  - Riwayat dari impor fase 5
- Existing patterns:
  - Note yang sering muncul di data Realbyte: `hangout`, `dinner`,
    `indomaret`, `lunch`, `camel kuning`, `shopee`, `shopeefood`, `nmax`,
    `pom banjaran`, `spotify`, `icloud`

## Tasks

### T1: Parser quick-add
**What:** `parseQuickAdd(text, context) → { amount, type, accountId,
toAccountId, occurredAt, note, confidence }`. Yang dikenali:
- Nominal: `25000`, `25.000`, `25rb`, `25k`, `1,5jt`, `1.5jt`, `2jt`, dan
  ekspresi `20rb+5rb`
- Akun: nama atau alias akun di buku (`gopay`, `bca`, `cash`, `jago utama`),
  dicocokkan secara fuzzy
- Jenis: default pengeluaran. `+` atau kata `gaji`/`terima`/`masuk` → pemasukan.
  `bca > gopay 100rb` atau `tf bca gopay` → transfer
- Waktu: `kemarin`, `2 hari lalu`, `senin`, `tgl 12`, jam `19.30`
- Sisanya jadi `note`

**Files:** `app/features/quick-add/parser.ts`,
`app/features/quick-add/parser.test.ts`
**Verify:** Minimal 40 kasus test lolos, termasuk `kopi 25rb gopay`,
`makan siang 35k`, `bensin 100rb kemarin`, `bca > gopay 99rb`,
`+ gaji 5jt bca`.

### T2: Saran kategori dari riwayat
**What:** RPC `suggest_from_note(book_id, note)`: cari transaksi dengan `note`
serupa (trigram), kembalikan kategori, akun, dan nominal yang paling sering,
dengan bobot transaksi terbaru lebih tinggi.
**Files:** migration baru, `app/features/quick-add/useSuggest.ts`
**Verify:** Dengan data Realbyte, `indomaret` menyarankan kategori yang paling
sering dipakai untuk `indomaret`.

### T3: Quick-add di panel catat transaksi
**What:** Sambungkan parser T1 dan saran T2 ke `QuickAddPanel` fase 3 (dialog
di iPad, kartu inline + pintasan `N` di layar lebar) dan ke kolom "Ketik saja"
di halaman `/transaction` (HP: form selalu halaman, bukan sheet). Kolom
"Ketik saja" langsung fokus, chip hasil parsing (nominal, akun, kategori,
tanggal, catatan) diperbarui saat mengetik, Enter = simpan. Tombol "Form
lengkap" pindah ke form fase 4 T3. Mode beruntun ("Simpan & lagi", dan selalu
di mode inline): setelah simpan, kolom kosong lagi untuk transaksi berikutnya.
**Files:** `app/components/money/QuickAddPanel.vue`,
`app/features/quick-add/*`
**Verify:** Mencatat 10 transaksi beruntun tanpa meninggalkan form. Satu
transaksi = mengetik + 1 tap.

### T4: Template
**What:** Simpan transaksi sebagai template, atau buat dari nol. Baris template
di atas quick-add, diurutkan dari yang paling sering dipakai. Template tanpa
nominal membuka keypad dulu.
**Files:** `app/features/templates/*`
**Verify:** Template "Spotify Agoy" mencatat transaksi dengan satu tap.

### T5: Transaksi berulang
**What:** Aturan berulang (harian, mingguan, bulanan tanggal X, tahunan) dengan
tanggal mulai/akhir. Fungsi `post_due_recurring()` dijalankan `pg_cron` setiap
pagi (WIB): aturan `auto_post` langsung jadi transaksi, sisanya jadi draf
"Perlu dikonfirmasi" di atas daftar transaksi.
**Files:** migration baru, `app/features/recurring/*`
**Verify:** Aturan bulanan tanggal 31 berjalan di tanggal terakhir untuk
bulan yang lebih pendek. Fungsi dijalankan dua kali di hari yang sama tidak
membuat transaksi ganda.

### T6: Shortcut iOS
**What:** Route `/add?text=...` membuka form catat transaksi (di HP halaman
`/transaction`; opsional dengan teks sudah terisi). Panduan di Pengaturan untuk
membuat Shortcut iOS: tombol home screen, Back Tap, atau Siri ("Catat pengeluaran") yang meminta teks lalu
membuka URL itu. Sediakan link iCloud Shortcut yang siap dipasang.
**Files:** `app/pages/add.vue`, `app/pages/settings/shortcuts.vue`
**Verify:** Dari Siri: "Catat pengeluaran" → ucapkan "kopi 25 ribu gopay" →
app terbuka dengan chip yang benar.
