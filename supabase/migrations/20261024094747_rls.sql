-- ============================================================
-- RLS per buku.
--
-- Aturan:
-- * Anggota buku (owner/editor/viewer) bisa membaca semua data buku itu.
-- * owner dan editor bisa menambah, mengubah, dan menghapus data buku.
-- * Hanya owner yang bisa mengubah buku, anggota, dan undangan.
-- * Anggota boleh keluar sendiri dari buku (hapus baris miliknya).
--
-- Helper memakai SECURITY DEFINER supaya membaca book_members tanpa
-- terkena RLS book_members sendiri (mencegah rekursi). Helper ada di
-- schema private sehingga tidak bisa dipanggil lewat API.
-- ============================================================

create function private.book_role_of(p_book_id uuid)
returns public.book_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.book_members m
  where m.book_id = p_book_id
    and m.user_id = (select auth.uid());
$$;

create function private.is_book_member(p_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.book_role_of(p_book_id) is not null;
$$;

create function private.can_edit_book(p_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.book_role_of(p_book_id) in ('owner', 'editor'), false);
$$;

create function private.is_book_owner(p_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.book_role_of(p_book_id) = 'owner', false);
$$;

-- Dua user berbagi minimal satu buku (untuk membaca nama anggota lain).
create function private.shares_book_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.book_members mine
    join public.book_members theirs on theirs.book_id = mine.book_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ------------------------------------------------------------
-- Aktifkan RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_members enable row level security;
alter table public.book_invites enable row level security;
alter table public.account_groups enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.import_batches enable row level security;
alter table public.templates enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create policy "profiles: baca diri sendiri dan sesama anggota buku"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_book_with(id));

create policy "profiles: ubah diri sendiri"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ------------------------------------------------------------
-- books
-- ------------------------------------------------------------
create policy "books: anggota bisa membaca"
  on public.books for select to authenticated
  using (private.is_book_member(id));

-- Pembuat langsung jadi owner lewat trigger (migration new_user).
create policy "books: user login bisa membuat"
  on public.books for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "books: owner bisa mengubah"
  on public.books for update to authenticated
  using (private.is_book_owner(id))
  with check (private.is_book_owner(id));

create policy "books: owner bisa menghapus"
  on public.books for delete to authenticated
  using (private.is_book_owner(id));

-- ------------------------------------------------------------
-- book_members
-- ------------------------------------------------------------
create policy "book_members: anggota bisa melihat sesama anggota"
  on public.book_members for select to authenticated
  using (private.is_book_member(book_id));

create policy "book_members: owner bisa menambah"
  on public.book_members for insert to authenticated
  with check (private.is_book_owner(book_id));

create policy "book_members: owner bisa mengubah peran"
  on public.book_members for update to authenticated
  using (private.is_book_owner(book_id))
  with check (private.is_book_owner(book_id));

create policy "book_members: owner mengeluarkan, anggota keluar sendiri"
  on public.book_members for delete to authenticated
  using (private.is_book_owner(book_id) or user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- book_invites (diterima lewat RPC accept_invite)
-- ------------------------------------------------------------
create policy "book_invites: owner bisa melihat"
  on public.book_invites for select to authenticated
  using (private.is_book_owner(book_id));

create policy "book_invites: owner bisa membuat"
  on public.book_invites for insert to authenticated
  with check (private.is_book_owner(book_id) and invited_by = (select auth.uid()));

create policy "book_invites: owner bisa membatalkan"
  on public.book_invites for delete to authenticated
  using (private.is_book_owner(book_id));

-- ------------------------------------------------------------
-- Tabel data buku: pola yang sama untuk semuanya
-- ------------------------------------------------------------
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'account_groups', 'accounts', 'categories', 'import_batches',
    'templates', 'recurring_rules', 'transactions', 'budgets'
  ]
  loop
    execute format(
      'create policy "%1$s: anggota bisa membaca" on public.%1$I
         for select to authenticated using (private.is_book_member(book_id))',
      v_table);
    execute format(
      'create policy "%1$s: owner/editor bisa menambah" on public.%1$I
         for insert to authenticated with check (private.can_edit_book(book_id))',
      v_table);
    execute format(
      'create policy "%1$s: owner/editor bisa mengubah" on public.%1$I
         for update to authenticated
         using (private.can_edit_book(book_id)) with check (private.can_edit_book(book_id))',
      v_table);
    execute format(
      'create policy "%1$s: owner/editor bisa menghapus" on public.%1$I
         for delete to authenticated using (private.can_edit_book(book_id))',
      v_table);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Owner terakhir tidak boleh keluar atau diturunkan perannya.
-- Dilewati saat buku atau akun user-nya sedang dihapus (cascade).
-- ------------------------------------------------------------
create function private.keep_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;
  -- Buku atau akun user-nya sedang dihapus (cascade)
  if not exists (select 1 from public.books b where b.id = old.book_id)
     or not exists (select 1 from public.profiles p where p.id = old.user_id) then
    return coalesce(new, old);
  end if;
  if not exists (
    select 1 from public.book_members m
    where m.book_id = old.book_id and m.role = 'owner' and m.user_id <> old.user_id
  ) then
    raise exception 'Buku harus punya minimal satu pemilik. Jadikan anggota lain pemilik dulu.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger book_members_keep_last_owner
  before update of role or delete on public.book_members
  for each row execute function private.keep_last_owner();

-- Tamu (anon) tidak punya akses apa pun ke data
revoke all on all tables in schema public from anon;
