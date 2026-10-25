# Format Mutasi Bank

Catatan format file mutasi yang didukung impor mutasi (fase 8). Diambil dari
contoh file asli Oktober 2026. Contoh di repo (`server/utils/bank/__fixtures__`)
sepenuhnya rekaan: nama, nomor rekening, dan ID tidak milik siapa pun.

Semua PDF dibaca dengan `unpdf` (teks + posisi x/y/lebar per potongan). Parser
bekerja dari posisi kolom, bukan urutan teks, karena satu baris tabel bisa
terdiri dari beberapa potongan di beberapa baris teks.

## SeaBank — Rekening Koran (PDF)

- **Asal:** aplikasi SeaBank → Rekening → Rekening Koran. Bisa bulan berjalan.
- **Dikenali dari:** teks `REKENING KORAN` dan `SeaBank`/`seabank.co.id`.
- **Kepala:** nama pemilik (huruf kapital, kiri atas), `NO. REKENING SEABANK: …`,
  periode `01 OCT 2026 00:00:00 sampai 25 OCT 2026 05:47:23`.
- **Ringkasan:** baris `TABUNGAN saldo-awal keluar masuk saldo-akhir`, dipakai
  untuk cek total hasil parsing.
- **Tabel:** `TANGGAL | TRANSAKSI | KELUAR (IDR) | MASUK (IDR) | SALDO AKHIR (IDR)`,
  diulang di tiap halaman.
  - Tanggal `01 OCT` tanpa tahun dan tanpa jam; tahun dari periode.
  - Kolom TRANSAKSI 2–3 baris teks: pihak lawan, lalu jenis (`Pembayaran`,
    `Transfer`, `Bunga`). Transfer antarbank: `NAMA / BANK XXX 1234567890 Transfer`.
    Refund diawali `Pengembalian Dana -` lalu nama merchant.
  - Nominal tanpa tanda, titik ribuan, tanpa desimal (`170.150`). Kolomnya
    ditentukan dari tepi kanan teks yang paling dekat dengan tepi kanan judul
    `(IDR)` kolom itu (angka rata kanan, lebarnya beragam).
  - Bunga harian kecil (`23`) muncul hampir tiap hari.

## Jago — Pockets Transactions History (PDF)

- **Asal:** aplikasi Jago → Kantong → Riwayat transaksi → unduh. Satu file per
  kantong; bisa bulan berjalan. GoPay Tabungan by Jago memakai format yang sama.
- **Dikenali dari:** `Pockets Transactions History` atau `jago.com`.
- **Kepala:** nama pemilik, `Nama Kantong 1234567890` (nomor rekening kantong),
  periode `01 Okt 2026 - 31 Okt 2026` (bulan bahasa Indonesia).
- **Tabel:** `Tanggal & Waktu | Sumber/Tujuan | Rincian Transaksi | Catatan | Jumlah | Saldo`.
  - Tanggal `01 Okt 2026`, jam `16.54` di bawahnya.
  - Jumlah bertanda (`-58.700`, `+1.000.000`); saldo dengan desimal (`14.865,49`).
  - Sumber/Tujuan dan Rincian berisi ID transaksi panjang yang terpotong
    (`…ID-1`, `ID# …`, potongan `D-1`) — dibuang. Catatan merchant berawalan kode
    (`004 - XL FlexMax 7GB`); `004 - GoPay - Generic` dibuang karena tidak berarti.
  - Pindah antarkantong: `Nama Kantong` + `Pindah uang antar Kantong`.
  - **Baris bisa terbelah halaman:** satu-dua potongan teks di dasar halaman,
    sisanya (tanggal, jumlah, saldo) di atas judul tabel halaman berikutnya.
    Parser menyambung potongan itu ke baris pertama halaman berikutnya.
  - Tidak ada total di file; cek hasil parsing lewat saldo berjalan.

## BCA

Belum didukung: e-statement myBCA/KlikBCA hanya tersedia untuk bulan yang
sudah lewat, jadi tidak membantu mengejar ketertinggalan bulan berjalan.
Mutasi bulan berjalan di myBCA tidak bisa diekspor ke file.

## Cek hasil parsing (file asli Okt 2026)

| Bank    | Baris | Cek                                                         |
| ------- | ----- | ----------------------------------------------------------- |
| SeaBank | 53    | total masuk & keluar sama persis dengan ringkasan, saldo bersambung |
| Jago    | 37    | saldo berjalan bersambung di semua baris (termasuk yang terbelah halaman) |
