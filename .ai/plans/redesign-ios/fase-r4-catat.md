# Fase R4: Form Catat

## Why
Keluhan utama adalah input yang lambat. Mockup memangkas ketukan dengan papan
angka sendiri yang bisa menghitung dan alur otomatis Nominal → Kategori → Akun →
Catatan, seperti Realbyte. Form sekarang memakai keyboard numerik iOS dan setiap
kolom dibuka sendiri.

## What
Form catat/ubah sesuai layar `form-keypad`, `form-category`, `form-account`,
`form-date`, `form-repeat`, `form-transfer`, `form-edit`, `form-copy`, plus
"Ketik cepat" dari menu tombol +.

## Constraints
### Must
- Bar atas: Batal, pil jenis **Pemasukan / Pengeluaran / Transfer** dengan sorotan
  yang meluncur 250ms (`.tpill .hl`), bintang = simpan/lepas bookmark.
- Baris label kiri, nilai kanan (`.fr`/`.fl`/`.fv`): Tanggal, Nominal, Kategori,
  Akun (atau Dari/Ke + tombol tukar + Biaya untuk transfer), Catatan dengan
  chip saran, Keterangan.
- **Panel dock** di bawah seperti keyboard: muncul pertama kali 280ms, ganti isi
  tanpa animasi, titik langkah di kepala panel.
- **Papan angka** (`press`, `evalT`, `calcApply`, baris 1587–1693): angka, 000,
  hapus, + − × ÷, =. Ekspresi tampil di atas nominal. Tombol = berganti jadi
  **Lanjut** bila tidak ada operasi, dan memajukan langkah.
- **Alur otomatis**: Nominal → Kategori → Akun → fokus Catatan. Grid kategori 4
  kolom, kategori bersub membuka baris sub di bawahnya lalu lanjut. Grid akun
  per grup akun.
- **Tanggal**: ketuk baris membuka kalender di dock, chip Kemarin/Hari ini, jam
  ±15 menit + chip jam cepat.
- **Ulangi** (tombol di baris tanggal, menu `REPEATS`) dan **cicilan** (lembar,
  2/3/6/12/24 bulan) memakai `recurring_rules` dan
  `features/recurring/installment.ts` yang sudah ada.
- Simpan / **Catat lagi**; mode ubah: Simpan perubahan, **Salin** (lembar:
  tanggal hari ini / tanggal asli), **Hapus** langsung + toast Urungkan.
- Pintasan "Dari foto struk" / "Dari mutasi bank" di form (papan TotalAkun,
  layar `form-keypad`).
- **Ketik cepat** dari menu tahan tombol +: panel `QuickAddPanel` digambar ulang,
  hasil parse membuka form terisi di langkah yang belum lengkap.
- Kaitkan transaksi (reimburse/utang, `LinkSection`) tetap ada di mode ubah
  sebagai baris grup iOS.
- Desktop: pintasan `N` tetap; papan angka bisa diketik dari keyboard fisik.
### Must Not
- Tidak menampilkan baris Foto, Tag, dan tombol tanda (!) (catatan fitur).
- Tidak memakai `<input type=number>` atau keyboard iOS untuk nominal.
### Out of Scope
- Impor (R7).

## Current State
- Relevant files: `app/components/money/{TransactionComposer,TransactionEditor,TransactionForm,QuickAddPanel,LinkSection,RecurringForm,TemplateForm}.vue`,
  `app/components/base/AmountInput.vue`, `app/components/data/GridPicker.vue`,
  `app/pages/{transaction,add}.vue`, `app/features/transactions/{useTxEditor,useLastChoice,usePickerItems}.ts`,
  `app/features/quick-add/*`, `app/features/recurring/*`.
- Existing patterns: `useLastChoice` mengingat akun/kategori terakhir;
  `useSuggest` memberi saran catatan; "Simpan & lagi" sudah ada.

## Tasks
### T1: Mesin kalkulator
**What:** Fungsi murni untuk ekspresi nominal (tekan tombol → state, evaluasi,
format), port dari `press`/`evalT`.
**Files:** `app/features/transactions/calculator.ts` + `.test.ts`
**Verify:** `pnpm test`: `25000+12500=37500`, bagi nol, hapus, 000, angka besar.

### T2: Kerangka form dan dock
**What:** `TxForm` dengan bar atas, baris `.fr`, `Dock` berisi papan angka; alur
langkah dan fokus otomatis.
**Files:** `app/components/money/TxForm.vue`, `app/components/money/Keypad.vue`
**Verify:** catat pengeluaran tanpa menyentuh keyboard iOS kecuali catatan.

### T3: Grid kategori dan akun
**What:** Ganti `GridPicker` dengan grid 4 kolom gaya mockup + baris sub.
**Files:** `app/components/money/{CategoryGrid,AccountGrid}.vue`
**Verify:** kategori bersub, akun dalam grup, akun tujuan transfer tidak bisa
sama dengan asal.

### T4: Tanggal, jam, ulangi, cicilan
**What:** Panel tanggal di dock, menu ulangi, lembar cicilan yang membuat
`recurring_rules`.
**Files:** `app/components/money/{DatePanel,RepeatMenu,InstallmentSheet}.vue`
**Verify:** transaksi berulang muncul di Lainnya → Ulangi & cicilan.

### T5: Transfer, ubah, salin, hapus
**What:** Mode transfer (tukar, biaya), mode ubah dengan Salin/Hapus + Urungkan,
bookmark dari bintang.
**Files:** `app/components/money/TxForm.vue`, `app/features/transactions/useTxEditor.ts`
**Verify:** hapus lalu Urungkan mengembalikan transaksi dan sorotan.

### T6: Ketik cepat dan pintasan impor
**What:** Item "Ketik cepat" di menu tombol +, panel quick-add gaya iOS; pintasan
impor di form.
**Files:** `app/components/money/QuickAddPanel.vue`, `app/components/layout/AddButton.vue`
**Verify:** "kopi 25rb gopay" mengisi nominal, kategori, akun.
