# Fase R8: Pengganti Fitur Native dan Perapian

## Why
Beberapa baris mockup (backup iCloud, pengingat harian) butuh pengganti versi
PWA. Setelah semua layar pindah ke gaya iOS, sisa tema opnamix dan prototipe
lama harus dibuang supaya tidak dipakai lagi tanpa sengaja.

## What
1. Backup & pulihkan sebagai file.
2. Pengingat harian lewat Web Push.
3. Pembersihan komponen, token, dan prototipe lama.
4. Audit gerak, aksesibilitas, dan uji iPhone asli.

## Constraints
### Must
- **Backup**: unduh satu file (JSON per buku: akun, grup, kategori, transaksi,
  budget, bookmark, ulangi, total akun). **Pulihkan** ke buku baru atau buku
  kosong, dengan pratinjau dan konfirmasi `IosAlert`.
- **Pengingat harian**: Web Push (iOS 16.4+ hanya di mode standalone), jam
  diatur di Lainnya, dikirim oleh cron Supabase/Cloudflare. Tampilkan petunjuk
  "Tambahkan ke Layar Utama" kalau belum standalone.
- Hapus: komponen tidak terpakai (`PageHeader`, `CompactTopBar`, `StatChip`,
  `FormPage`, `GridPicker`, `AmountInput`, kaca opnamix), token opnamix,
  `app/pages/prototype/*` lama (katalog R1 tetap), `design/prototype.html` dan
  `design/preview.html`, `app/layouts/prototype.vue`, `app/mocks/*` bila tidak
  dipakai.
- Audit: `improve-animations`, `remove-animations`, `find-animation-opportunities`,
  `design:accessibility-review`, `mobile-native`.
### Must Not
- Backup tidak menyimpan file di server; semua di perangkat.
### Out of Scope
- Face ID/WebAuthn, widget, ikon aplikasi (catatan fitur).

## Current State
- Relevant files: `app/features/export/*`, `app/features/lock/*`,
  `server/api/*`, `supabase/migrations/*`, `wrangler.jsonc`.
- Existing patterns: ekspor Excel format Realbyte sudah ada.

## Tasks
### T1: Backup dan pulihkan
**What:** Ekspor JSON di klien, pulihkan lewat RPC impor yang ada atau RPC baru.
**Files:** `app/features/backup/*` (baru), `app/pages/settings/backup.vue`,
`supabase/migrations/*_restore_backup.sql` (bila perlu)
**Verify:** backup → pulihkan ke buku baru → saldo dan jumlah transaksi sama.

### T2: Pengingat harian Web Push
**What:** Langganan push, simpan endpoint, kirim terjadwal, pengaturan jam.
**Files:** `server/api/push/*`, `supabase/migrations/*_push_subscriptions.sql`,
`app/pages/settings/reminder.vue`
**Verify:** iPhone asli standalone menerima notifikasi.

### T3: Bersihkan tema lama
**What:** Hapus file dan token yang disebut di Constraints; pastikan tidak ada
impor tersisa.
**Files:** lihat Constraints
**Verify:** `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

### T4: Audit dan uji akhir
**What:** Jalankan skill audit, perbaiki temuan, uji checklist
`.ai/conventions/design.md` di iPhone standalone, iPad, desktop, terang/gelap,
Reduce Motion, Reduce Transparency.
**Files:** sesuai temuan
**Verify:** checklist review layar terisi semua.
