# Fase 2: Database, RLS, dan Login

## Why
App akan dipakai beberapa orang, dan setiap orang bisa berbagi buku keuangan.
Kalau aturan akses baru ditambahkan setelah data ada, semua query dan policy
harus ditulis ulang. Schema juga harus bisa dibangun dari repo di project
Supabase kosong. Ini pelajaran dari `opnamix` fase 1, yang tabel intinya tidak
ada di migration.

## What
1. Satu migration baseline untuk seluruh schema: tabel, enum, view, fungsi,
   trigger, RLS.
2. Login email + kode OTP 6 digit.
3. Saat daftar, user otomatis punya profil dan buku "Pribadi".

## Constraints
### Must
- RLS aktif di semua tabel. Akses ditentukan keanggotaan buku, bukan
  `user_id` di tiap baris
- Helper `is_book_member(book_id)` dan `can_edit_book(book_id)`:
  `security definer`, `set search_path = public`, `stable`
- RPC `security invoker` (tetap tunduk RLS), pesan error bahasa Indonesia,
  mengikuti gaya `opnamix/supabase/migrations/20261014010000_update_stock_atomic.sql`
- Nominal `bigint`, cek `amount > 0`
- Login pakai **OTP kode**, bukan magic link. Di iPhone, magic link terbuka di
  Safari, bukan di PWA yang ter-install, jadi sesinya tidak nyambung

### Must Not
- Menyimpan saldo akun sebagai kolom (dihitung lewat view)
- Memakai service role key di client

### Out of Scope
- UI undangan dan pindah buku (fase 9). Tabel dan RPC-nya sudah dibuat di sini
- Tabel lampiran foto (fase 10)

## Current State
- Relevant files:
  - Belum ada `supabase/`
  - Acuan: `opnamix/supabase/migrations/20260101000000_baseline.sql`,
    `20261014000000_enable_rls_policies.sql`, `supabase/seed.sql`
- Existing patterns:
  - `opnamix`: helper `is_staff()`, `has_any_role()` untuk RLS; trigger
    `auth.users` → `profiles`

## Schema

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `display_name` | |
| `books` | `name`, `currency` (default `IDR`), `created_by` | |
| `book_members` | `book_id`, `user_id`, `role` (`owner`/`editor`/`viewer`) | PK `(book_id, user_id)` |
| `book_invites` | `book_id`, `email`, `role`, `token`, `expires_at`, `accepted_at` | |
| `account_groups` | `book_id`, `name`, `kind`, `sort` | `kind`: `cash`, `bank`, `ewallet`, `card`, `savings`, `investment`, `receivable`, `loan`, `other` |
| `accounts` | `book_id`, `group_id`, `name`, `opening_balance`, `include_in_total`, `archived`, `sort`, `note`, `statement_day`, `due_day` | |
| `categories` | `book_id`, `parent_id`, `kind` (`income`/`expense`), `name`, `emoji`, `sort`, `archived` | 2 level |
| `transactions` | `book_id`, `type` (`income`/`expense`/`transfer`), `occurred_at`, `amount`, `account_id`, `to_account_id`, `fee`, `category_id`, `is_adjustment`, `note`, `description`, `source`, `import_batch_id`, `dedupe_key`, `recurring_rule_id`, `created_by` | `note` = toko/tempat, `description` = detail |
| `templates` | `book_id`, `name`, `type`, `amount` (nullable), `account_id`, `to_account_id`, `category_id`, `note`, `sort`, `use_count` | |
| `recurring_rules` | kolom template + `frequency`, `interval`, `day_of_month`, `start_on`, `end_on`, `next_run_on`, `auto_post` | |
| `budgets` | `book_id`, `category_id` (null = total), `amount`, `period`, `start_on` | |
| `import_batches` | `book_id`, `source`, `filename`, `row_count`, `status`, `created_by` | |
| view `account_balances` | `account_id`, `balance` | `security_invoker = on` |

`source`: `manual`, `quick_add`, `template`, `recurring`, `import_realbyte`,
`import_bank`, `ocr`.

## Tasks

### T1: Baseline schema
**What:** Migration `20261101000000_baseline.sql` berisi semua enum, tabel,
foreign key (dengan `book_id` yang sama, dicek lewat constraint atau trigger
supaya transaksi tidak bisa menunjuk akun dari buku lain), index
(`(book_id, occurred_at desc)`, `(book_id, account_id)`,
`(book_id, category_id)`, unik `(book_id, dedupe_key)`, trigram di `note` dan
`description`), trigger `updated_at`, dan view `account_balances`.
**Files:** `supabase/migrations/20261101000000_baseline.sql`,
`supabase/config.toml`
**Verify:** `supabase db reset` di lokal tanpa error. Insert transfer dengan
`to_account_id` null ditolak. Insert transaksi ke akun dari buku lain ditolak.

### T2: RLS per buku
**What:** Helper `is_book_member` dan `can_edit_book`. Policy: anggota bisa
`select`; `owner` dan `editor` bisa `insert/update/delete`; hanya `owner` yang
bisa mengubah `books` dan `book_members`.
**Files:** `supabase/migrations/20261101010000_rls.sql`
**Verify:** Test SQL (`supabase/tests/rls.test.sql`, pgTAP) dengan 3 user:
pemilik, editor, viewer, dan orang luar. Orang luar tidak melihat apa pun,
viewer tidak bisa menulis.

### T3: Trigger user baru
**What:** Trigger di `auth.users` membuat `profiles`, buku "Pribadi", baris
`book_members` sebagai `owner`, dan kategori + grup akun default (mengikuti
kategori Realbyte yang paling umum).
**Files:** `supabase/migrations/20261101020000_new_user.sql`
**Verify:** Daftar user baru → langsung punya 1 buku, kategori default, dan
grup akun default.

### T4: RPC undangan
**What:** `create_invite(book_id, email, role)` (hanya owner) dan
`accept_invite(token)` (mengecek email penerima = email user yang login,
belum kedaluwarsa).
**Files:** `supabase/migrations/20261101030000_invites.sql`
**Verify:** Undangan kedaluwarsa atau untuk email lain ditolak dengan pesan
yang jelas.

### T5: Login OTP
**What:** Halaman `/login`: isi email → kirim kode → isi 6 digit (kolom OTP
dengan `autocomplete="one-time-code"` supaya iOS menawarkan kode dari
email). Middleware Nuxt mengarahkan tamu ke `/login`. Template email OTP di
Supabase dalam bahasa Indonesia.
**Files:** `app/pages/login.vue`, `app/middleware/auth.global.ts`,
`app/features/auth/*`
**Verify:** Di PWA ter-install: login sampai masuk tanpa membuka Safari. Sesi
tetap ada setelah app ditutup dan dibuka lagi.

### T6: Tipe TypeScript
**What:** Jalankan `pnpm db:types`, commit hasilnya.
**Files:** `app/lib/database.types.ts`
**Verify:** `pnpm typecheck` lolos.
