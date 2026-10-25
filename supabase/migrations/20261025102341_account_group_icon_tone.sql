-- Ikon dan warna grup akun bisa dipilih sendiri.
-- null = ikut jenis grup (account_kind), jadi grup lama dan grup yang dibuat
-- impor/new_user tetap tampil seperti sebelumnya. `icon` adalah kunci ikon
-- kebab-case yang dikenali client (app/features/accounts/style.ts).
alter table public.account_groups
  add column icon text check (icon ~ '^[a-z0-9-]{1,40}$'),
  add column tone text check (tone in ('neutral', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'));
