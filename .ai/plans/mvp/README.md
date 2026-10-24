# Rencana Money Manager

Pengganti Realbyte Money Manager dalam bentuk PWA untuk iPhone. Semua fitur
Realbyte ikut dibawa, plus solusi untuk dua keluhan utama:

1. **Input manual lambat.** Kalau ketinggalan seminggu, mengejarnya makan waktu
   lama.
2. **Tidak ada impor di iOS.**

Tiap fase punya spec sendiri dengan format `.ai/templates/spec.md`.

## Keputusan teknologi

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | **Nuxt 4** + TypeScript | Pilihan user, sama seperti `porto`. Server route (Nitro) dipakai untuk impor dan AI, jadi API key tidak pernah sampai ke HP. |
| UI | Tailwind + **shadcn-vue** (Reka UI) | Versi Vue dari shadcn/ui di `opnamix`. |
| Data | **TanStack Vue Query** | Pola dari `opnamix/.ai/conventions/data-fetching.md`: cache, optimistic update, refetch saat app dibuka lagi. |
| Form | vee-validate + zod | Skema zod yang sama dipakai di server route. |
| Backend | **Supabase** (Postgres, Auth, RLS, pg_cron) | Pola migration dan RPC dari `opnamix/supabase/migrations`. |
| Desain | Tema **design system opnamix**, Liquid Glass hanya di navigasi yang melayang | Acuan: `design/prototype.html` (HP, iPad, desktop). Gerak dengan CSS transition + WAAPI, mengikuti skill `emil-design-eng`. |
| Excel | `xlsx` (SheetJS, dari CDN resmi) | Sama seperti `opnamix`. |
| Deploy | Cloudflare Workers, preset Nitro `cloudflare_module` | `porto` deploy sebagai aset statis. Di sini butuh server route, jadi pakai Worker penuh. |

### Prinsip data

- **Semua data milik buku (`book`), bukan milik user.** User mengakses buku
  lewat `book_members` (`owner`/`editor`/`viewer`). Setiap user punya buku
  pribadi dan bisa mengundang orang lain ke buku mana pun miliknya.
- **Nominal disimpan sebagai `bigint` rupiah utuh**, bukan float. Satu mata
  uang per buku (IDR) di MVP.
- **Saldo akun dihitung, tidak disimpan**: saldo awal + total transaksi.
- **Transfer = 1 baris** (dari akun → ke akun, plus biaya opsional), bukan 2
  baris seperti di Realbyte.
- **Setiap transaksi mencatat asalnya** (`source`, `import_batch_id`), supaya
  impor bisa dibatalkan dan tidak dobel.
- Zona waktu `Asia/Jakarta`.

## Fase

| Fase | Spec | Inti | Risiko kalau ditunda |
|---|---|---|---|
| 1 | [fase-1-fondasi.md](fase-1-fondasi.md) | Project Nuxt, tooling, PWA, deploy | Semua fase lain tidak punya tempat berjalan |
| 2 | [fase-2-database.md](fase-2-database.md) | Schema, RLS per buku, trigger buku pribadi, login OTP | Model berbagi sulit ditambahkan belakangan |
| 3 | [fase-3-design.md](fase-3-design.md) | Token opnamix, kerangka responsif HP/iPad/desktop, komponen dasar, panel catat transaksi | UI dibangun dua kali: sekali asal jadi, sekali dirapikan |
| 4 | [fase-4-inti.md](fase-4-inti.md) | Akun, kategori, transaksi, tampilan harian/kalender/bulanan | Belum bisa dipakai sehari-hari |
| 5 | [fase-5-impor-realbyte.md](fase-5-impor-realbyte.md) | Impor xlsx Realbyte, ekspor Excel | Data 2 tahun tertahan di Realbyte |
| 6 | [fase-6-input-cepat.md](fase-6-input-cepat.md) | Quick-add teks bebas, template, transaksi berulang, Shortcut iOS | Keluhan #1 tidak terjawab |
| 7 | [fase-7-statistik-budget.md](fase-7-statistik-budget.md) | Statistik, budget, pencarian & filter | Fitur Realbyte belum lengkap |
| 8 | [fase-8-impor-bank.md](fase-8-impor-bank.md) | Impor mutasi bank + pencocokan | Mengejar transaksi yang tertinggal tetap manual |
| 9 | [fase-9-berbagi-buku.md](fase-9-berbagi-buku.md) | Undangan, peran, pindah buku | Belum bisa dipakai bersama orang lain |
| 10 | [fase-10-lanjutan.md](fase-10-lanjutan.md) | Foto struk (AI), PIN, kartu kredit, cicilan | Rendah, nilai tambah |

## Urutan dan ketergantungan

```
Fase 1 ──┬──> Fase 2 ──┬──> Fase 4 ──> Fase 5 ──> Fase 6 ──> Fase 7
         │             │       │                     │
         └──> Fase 3 ──┘       │                     └──> Fase 8
                               └──> Fase 9 (kapan saja setelah 4)
                                                     Fase 10 (setelah 6)
```

- **Fase 2 dan 3 independen** setelah fase 1 dan bisa jalan paralel. Fase 3
  memakai data tiruan (mock), jadi tidak menunggu database.
- **Fase 4 butuh keduanya**: tabel dari fase 2 dan komponen dari fase 3.
- **Fase 5 sebelum fase 6** dengan sengaja: quick-add menyarankan kategori dari
  riwayat transaksi, dan riwayat itu baru ada setelah data Realbyte masuk.
- **Fase 8 butuh contoh file mutasi asli** dari BCA, Jago, dan Seabank.

## Yang bisa dikerjakan paralel

Pekerjaan boleh paralel kalau file yang disentuh tidak sama. Konflik di
`pnpm-lock.yaml` tidak dihitung.

| Gelombang | Jalur paralel | Catatan |
|---|---|---|
| A | **Fase 1**, sendirian | Membuat struktur folder yang dipakai semua fase |
| B | **Fase 2** (`supabase/`) ∥ **Fase 3** (`app/components/ui`, `app/assets`, `app/pages/prototype`) | Fase 3 T5 (layar prototipe) memakai mock di `app/mocks`, bukan Supabase |
| C | **Fase 4** T1 (akun) ∥ T2 (kategori), lalu T3-T6 (transaksi & tampilan) | T3 butuh akun dan kategori |
| D | **Fase 5** ∥ **Fase 9** | Folder fitur berbeda (`features/import` vs `features/books`) |
| E | **Fase 6** T1-T2 (quick-add) ∥ T3-T4 (template, berulang) ∥ **Fase 7** | Fase 7 hanya membaca transaksi |
| F | **Fase 8**, lalu **Fase 10** | |

## Aturan kerja untuk semua fase

- Satu fase = satu branch dan satu PR. Fase besar (4, 6) boleh dipecah per
  task.
- Setiap task harus lolos `pnpm build`, `pnpm typecheck`, dan `pnpm lint`.
- Semua layar baru memakai komponen dan token dari fase 3. Tidak ada warna,
  jarak, durasi, atau spring yang ditulis langsung di halaman.
- Uji di **iPhone asli dalam mode standalone** (Add to Home Screen), di iPad, dan
  di desktop (lebar ≥ 1180px), bukan
  hanya di simulator desktop. Safe area, keyboard, dan gestur sering berbeda.
- Uji manual alur utama setelah tiap fase: login OTP, tambah transaksi, transfer,
  lihat saldo, impor, ekspor.
