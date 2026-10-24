-- ============================================================
-- Ikon dan warna kategori.
--
-- Desain (fase 3) menampilkan kategori sebagai ikon lucide di kotak
-- berwarna, bukan emoji. `icon` adalah nama ikon (kebab-case, mis.
-- "shopping-bag") dari daftar yang dikenali client
-- (app/features/categories/icons.ts); `tone` adalah palet r1–r6 atau
-- neutral. Kolom `emoji` tetap ada untuk data impor Realbyte.
-- ============================================================

alter table public.categories
  add column icon text not null default 'tag'
    check (icon ~ '^[a-z0-9-]{1,40}$'),
  add column tone text not null default 'neutral'
    check (tone in ('neutral', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'));

-- Kategori default yang sudah terlanjur dibuat (per nama)
update public.categories c
set icon = m.icon, tone = m.tone
from (values
  ('expense', 'Makan & Minum', 'utensils', 'r2'),
  ('expense', 'Makan berat', 'utensils', 'r2'),
  ('expense', 'Jajan', 'cookie', 'r4'),
  ('expense', 'Kopi', 'coffee', 'r2'),
  ('expense', 'Transportasi', 'car', 'r5'),
  ('expense', 'Bensin', 'fuel', 'r5'),
  ('expense', 'Parkir', 'square-parking', 'r1'),
  ('expense', 'Ojek & Taksi', 'car-taxi-front', 'r5'),
  ('expense', 'Belanja', 'shopping-bag', 'r6'),
  ('expense', 'Kebutuhan rumah', 'shopping-basket', 'r6'),
  ('expense', 'Pakaian', 'shirt', 'r6'),
  ('expense', 'Tempat Tinggal', 'house', 'r1'),
  ('expense', 'Tagihan & Langganan', 'receipt', 'r1'),
  ('expense', 'Pulsa & Internet', 'wifi', 'r1'),
  ('expense', 'Langganan', 'headphones', 'r1'),
  ('expense', 'Kesehatan', 'heart-pulse', 'r3'),
  ('expense', 'Hiburan', 'clapperboard', 'r4'),
  ('expense', 'Hadiah & Sosial', 'gift', 'r5'),
  ('expense', 'Keluarga', 'users', 'r5'),
  ('expense', 'Teman', 'smile', 'r5'),
  ('expense', 'Sedekah', 'hand-heart', 'r5'),
  ('expense', 'Pendidikan', 'graduation-cap', 'r1'),
  ('expense', 'Biaya Admin', 'coins', 'r4'),
  ('expense', 'Lainnya', 'package', 'neutral'),
  ('income', 'Gaji', 'wallet', 'r3'),
  ('income', 'Bonus', 'award', 'r3'),
  ('income', 'Proyek', 'briefcase', 'r1'),
  ('income', 'Hasil Investasi', 'trending-up', 'r4'),
  ('income', 'Hadiah', 'gift', 'r5'),
  ('income', 'Lainnya', 'package', 'neutral')
) as m(kind, name, icon, tone)
where c.kind::text = m.kind and c.name = m.name;

-- Data default buku baru, kini dengan ikon dan warna
create or replace function private.seed_book_defaults(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cash_group uuid;
  v_parent uuid;
  v_cat record;
  v_sub record;
  v_sort integer := 0;
begin
  insert into public.account_groups (book_id, name, kind, sort)
  values
    (p_book_id, 'Tunai', 'cash', 0),
    (p_book_id, 'Bank', 'bank', 1),
    (p_book_id, 'E-Wallet', 'ewallet', 2),
    (p_book_id, 'Kartu Kredit', 'card', 3),
    (p_book_id, 'Tabungan', 'savings', 4),
    (p_book_id, 'Investasi', 'investment', 5),
    (p_book_id, 'Piutang', 'receivable', 6),
    (p_book_id, 'Utang', 'loan', 7);

  select id into v_cash_group
  from public.account_groups
  where book_id = p_book_id and kind = 'cash';

  insert into public.accounts (book_id, group_id, name)
  values (p_book_id, v_cash_group, 'Tunai');

  -- subs: array "ikon|nama"
  for v_cat in
    select * from (values
      ('expense', '🍔', 'Makan & Minum', 'utensils', 'r2', array['utensils|Makan berat', 'cookie|Jajan', 'coffee|Kopi']),
      ('expense', '🛵', 'Transportasi', 'car', 'r5', array['fuel|Bensin', 'square-parking|Parkir', 'car-taxi-front|Ojek & Taksi']),
      ('expense', '🛍️', 'Belanja', 'shopping-bag', 'r6', array['shopping-basket|Kebutuhan rumah', 'shirt|Pakaian']),
      ('expense', '🏠', 'Tempat Tinggal', 'house', 'r1', array[]::text[]),
      ('expense', '📱', 'Tagihan & Langganan', 'receipt', 'r1', array['wifi|Pulsa & Internet', 'headphones|Langganan']),
      ('expense', '💊', 'Kesehatan', 'heart-pulse', 'r3', array[]::text[]),
      ('expense', '🎬', 'Hiburan', 'clapperboard', 'r4', array[]::text[]),
      ('expense', '🎁', 'Hadiah & Sosial', 'gift', 'r5', array['users|Keluarga', 'smile|Teman', 'hand-heart|Sedekah']),
      ('expense', '🎓', 'Pendidikan', 'graduation-cap', 'r1', array[]::text[]),
      ('expense', '💲', 'Biaya Admin', 'coins', 'r4', array[]::text[]),
      ('expense', '📦', 'Lainnya', 'package', 'neutral', array[]::text[]),
      ('income', '💰', 'Gaji', 'wallet', 'r3', array[]::text[]),
      ('income', '🏅', 'Bonus', 'award', 'r3', array[]::text[]),
      ('income', '💼', 'Proyek', 'briefcase', 'r1', array[]::text[]),
      ('income', '📈', 'Hasil Investasi', 'trending-up', 'r4', array[]::text[]),
      ('income', '🎁', 'Hadiah', 'gift', 'r5', array[]::text[]),
      ('income', '📦', 'Lainnya', 'package', 'neutral', array[]::text[])
    ) as t(kind, emoji, name, icon, tone, subs)
  loop
    insert into public.categories (book_id, kind, emoji, name, icon, tone, sort)
    values (p_book_id, v_cat.kind::public.category_kind, v_cat.emoji, v_cat.name, v_cat.icon, v_cat.tone, v_sort)
    returning id into v_parent;
    v_sort := v_sort + 1;

    for v_sub in
      select s, ord from unnest(v_cat.subs) with ordinality as u(s, ord)
    loop
      insert into public.categories (book_id, parent_id, kind, name, icon, tone, sort)
      values (
        p_book_id, v_parent, v_cat.kind::public.category_kind,
        split_part(v_sub.s, '|', 2),
        split_part(v_sub.s, '|', 1),
        v_cat.tone,
        v_sub.ord::integer
      );
    end loop;
  end loop;
end;
$$;

revoke all on function private.seed_book_defaults(uuid) from public, anon, authenticated;
