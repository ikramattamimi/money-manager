-- ============================================================
-- User baru dan buku baru.
--
-- * Daftar (auth.users insert) -> profil + buku "Pribadi".
-- * Buku baru (dari mana pun) -> pembuatnya jadi owner, plus grup akun,
--   akun "Tunai", dan kategori default.
-- ============================================================

-- Data default untuk buku baru. Kategori mengikuti kebiasaan pencatatan
-- di Realbyte, dengan nama bahasa Indonesia.
create function private.seed_book_defaults(p_book_id uuid)
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

  for v_cat in
    select * from (values
      ('expense', '🍔', 'Makan & Minum', array['🍛 Makan berat', '🍟 Jajan', '☕ Kopi']),
      ('expense', '🛵', 'Transportasi', array['⛽ Bensin', '🅿️ Parkir', '🚕 Ojek & Taksi']),
      ('expense', '🛍️', 'Belanja', array['🧺 Kebutuhan rumah', '👕 Pakaian']),
      ('expense', '🏠', 'Tempat Tinggal', array[]::text[]),
      ('expense', '📱', 'Tagihan & Langganan', array['📶 Pulsa & Internet', '🎧 Langganan']),
      ('expense', '💊', 'Kesehatan', array[]::text[]),
      ('expense', '🎬', 'Hiburan', array[]::text[]),
      ('expense', '🎁', 'Hadiah & Sosial', array['👪 Keluarga', '👥 Teman', '🤲 Sedekah']),
      ('expense', '🎓', 'Pendidikan', array[]::text[]),
      ('expense', '💲', 'Biaya Admin', array[]::text[]),
      ('expense', '📦', 'Lainnya', array[]::text[]),
      ('income', '💰', 'Gaji', array[]::text[]),
      ('income', '🏅', 'Bonus', array[]::text[]),
      ('income', '💼', 'Proyek', array[]::text[]),
      ('income', '📈', 'Hasil Investasi', array[]::text[]),
      ('income', '🎁', 'Hadiah', array[]::text[]),
      ('income', '📦', 'Lainnya', array[]::text[])
    ) as t(kind, emoji, name, subs)
  loop
    insert into public.categories (book_id, kind, emoji, name, sort)
    values (p_book_id, v_cat.kind::public.category_kind, v_cat.emoji, v_cat.name, v_sort)
    returning id into v_parent;
    v_sort := v_sort + 1;

    for v_sub in
      select s, ord from unnest(v_cat.subs) with ordinality as u(s, ord)
    loop
      insert into public.categories (book_id, parent_id, kind, emoji, name, sort)
      values (
        p_book_id, v_parent, v_cat.kind::public.category_kind,
        split_part(v_sub.s, ' ', 1),
        substr(v_sub.s, length(split_part(v_sub.s, ' ', 1)) + 2),
        v_sub.ord::integer
      );
    end loop;
  end loop;
end;
$$;

-- Buku baru: pembuatnya jadi owner, lalu isi data default.
create function private.handle_new_book()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.book_members (book_id, user_id, role)
    values (new.id, new.created_by, 'owner');
  end if;
  perform private.seed_book_defaults(new.id);
  return new;
end;
$$;

create trigger books_after_insert
  after insert on public.books
  for each row execute function private.handle_new_book();

-- User baru: profil + buku pribadi.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), '')
  );

  insert into public.books (name, created_by)
  values ('Pribadi', new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on function private.seed_book_defaults(uuid) from public, anon, authenticated;
revoke all on function private.handle_new_book() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
