-- ============================================================
-- Test RLS, trigger, dan RPC fase 2.
--
-- Jalankan sebagai postgres (SQL editor Supabase, psql, atau MCP
-- execute_sql). Semua berjalan dalam satu transaksi yang di-ROLLBACK,
-- jadi tidak ada data yang tertinggal. Kalau ada yang gagal, skrip
-- berhenti dengan pesan "GAGAL: ...".
--
-- User uji: A (pemilik buku A), B (editor di buku A), C (viewer di buku A),
-- D (orang luar).
-- ============================================================
begin;

create function pg_temp.login(p_user text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', current_setting('test.' || p_user),
    'email', lower(p_user) || '@test.local',
    'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.check(p_ok boolean, p_msg text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'GAGAL: %', p_msg;
  end if;
end;
$$;

-- Harus error; kalau p_state diisi, SQLSTATE-nya juga harus cocok.
create function pg_temp.expect_error(p_sql text, p_msg text, p_state text default null)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_state is not null and sqlstate <> p_state then
      raise exception 'GAGAL: % (error %, harusnya %: %)', p_msg, sqlstate, p_state, sqlerrm;
    end if;
    return;
  end;
  raise exception 'GAGAL: % (tidak error)', p_msg;
end;
$$;

grant execute on all functions in schema pg_temp to authenticated, anon;

-- ------------------------------------------------------------
-- Siapkan 4 user (trigger membuat profil + buku pribadi)
-- ------------------------------------------------------------
do $$
declare
  v_name text;
  v_id uuid;
begin
  foreach v_name in array array['A', 'B', 'C', 'D'] loop
    v_id := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
    values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            lower(v_name) || '@test.local', '{}');
    perform set_config('test.' || v_name, v_id::text, false);
    perform set_config('test.book_' || v_name,
      (select id::text from public.books where created_by = v_id), false);
  end loop;
end;
$$;

-- T3: user baru punya profil, 1 buku, owner, dan data default
do $$
declare
  v_book uuid := current_setting('test.book_A')::uuid;
begin
  perform pg_temp.check(
    (select display_name from public.profiles where id = current_setting('test.A')::uuid) = 'a',
    'profil dibuat dengan nama dari email');
  perform pg_temp.check(
    (select count(*) from public.books where created_by = current_setting('test.A')::uuid) = 1,
    'user baru punya tepat 1 buku');
  perform pg_temp.check(
    (select role from public.book_members where book_id = v_book) = 'owner', 'pembuat jadi owner');
  perform pg_temp.check(
    (select count(*) from public.account_groups where book_id = v_book) = 8, '8 grup akun default');
  perform pg_temp.check(
    (select count(*) from public.accounts where book_id = v_book) = 1, 'akun Tunai default');
  perform pg_temp.check(
    (select count(*) from public.categories where book_id = v_book and parent_id is null) = 17,
    '17 kategori utama default');
  perform pg_temp.check(
    (select count(*) from public.categories where book_id = v_book and parent_id is not null) = 13,
    '13 subkategori default');
  perform pg_temp.check(
    (select emoji || '|' || name from public.categories
     where book_id = v_book and name = 'Parkir') = '🅿️|Parkir',
    'emoji subkategori dipisah dari nama');
end;
$$;

-- ------------------------------------------------------------
-- T4: undangan
-- ------------------------------------------------------------
select pg_temp.login('A');

select pg_temp.expect_error(
  format($q$select public.create_invite(%L, 'a@test.local')$q$, current_setting('test.book_A')),
  'tidak bisa mengundang diri sendiri', '22023');
select pg_temp.expect_error(
  format($q$select public.create_invite(%L, 'b@test.local', 'owner')$q$,
         current_setting('test.book_A')),
  'undangan peran owner ditolak', '22023');

select set_config('test.invite_B',
  (public.create_invite(current_setting('test.book_A')::uuid, ' B@Test.local ', 'editor')).token,
  false);
select set_config('test.invite_C',
  (public.create_invite(current_setting('test.book_A')::uuid, 'c@test.local', 'viewer')).token,
  false);

select pg_temp.check(
  (select count(*) from public.book_invites where book_id = current_setting('test.book_A')::uuid) = 2,
  'owner melihat 2 undangan, email dinormalisasi');

-- D bukan owner buku A
select pg_temp.login('D');
select pg_temp.expect_error(
  format($q$select public.create_invite(%L, 'x@test.local')$q$, current_setting('test.book_A')),
  'bukan owner tidak bisa mengundang', '42501');
select pg_temp.check(
  (select count(*) from public.book_invites) = 0, 'orang luar tidak melihat undangan');
-- D tidak bisa memakai undangan untuk email B
select pg_temp.expect_error(
  format($q$select public.accept_invite(%L)$q$, current_setting('test.invite_B')),
  'undangan untuk email lain ditolak', '42501');

select pg_temp.login('B');
select pg_temp.check(
  public.accept_invite(current_setting('test.invite_B')) = current_setting('test.book_A')::uuid,
  'B menerima undangan');
select pg_temp.expect_error(
  format($q$select public.accept_invite(%L)$q$, current_setting('test.invite_B')),
  'undangan tidak bisa dipakai dua kali', 'P0001');

select pg_temp.login('C');
select public.accept_invite(current_setting('test.invite_C'));

-- Undangan kedaluwarsa
reset role;
insert into public.book_invites (book_id, email, role, expires_at, token)
values (current_setting('test.book_A')::uuid, 'd@test.local', 'viewer',
        now() - interval '1 day', 'expired-token');
select pg_temp.login('D');
select pg_temp.expect_error(
  $q$select public.accept_invite('expired-token')$q$, 'undangan kedaluwarsa ditolak', 'P0001');

-- ------------------------------------------------------------
-- T2: RLS per peran
-- ------------------------------------------------------------
-- A (owner): siapkan akun kedua dan ambil id akun/kategori
select pg_temp.login('A');
do $$
declare
  v_book uuid := current_setting('test.book_A')::uuid;
begin
  insert into public.accounts (book_id, group_id, name)
  select v_book, id, 'BCA' from public.account_groups where book_id = v_book and kind = 'bank';
  perform set_config('test.cash_A',
    (select id::text from public.accounts where book_id = v_book and name = 'Tunai'), false);
  perform set_config('test.bca_A',
    (select id::text from public.accounts where book_id = v_book and name = 'BCA'), false);
  perform set_config('test.cat_food',
    (select id::text from public.categories where book_id = v_book and name = 'Makan & Minum'),
    false);
  perform set_config('test.cat_salary',
    (select id::text from public.categories where book_id = v_book and name = 'Gaji'), false);
end;
$$;

-- B (editor) bisa mencatat
select pg_temp.login('B');
insert into public.transactions (book_id, type, amount, account_id, category_id, note)
values (current_setting('test.book_A')::uuid, 'expense', 25000,
        current_setting('test.cash_A')::uuid, current_setting('test.cat_food')::uuid, 'kopi');
select pg_temp.check(
  (select created_by from public.transactions where note = 'kopi') = current_setting('test.B')::uuid,
  'created_by otomatis diisi user yang mencatat');
select pg_temp.check(
  (select count(*) from public.profiles) = 3, 'B melihat profil A, B, C (sesama anggota)');
-- Editor tidak bisa mengubah buku (RLS: baris tidak ter-update, tanpa error)
update public.books set name = 'Diubah editor' where id = current_setting('test.book_A')::uuid;
select pg_temp.check(
  (select name from public.books where id = current_setting('test.book_A')::uuid) = 'Pribadi',
  'update buku oleh editor tidak berefek');

-- C (viewer) hanya membaca
select pg_temp.login('C');
select pg_temp.check(
  (select count(*) from public.transactions where book_id = current_setting('test.book_A')::uuid) = 1,
  'viewer bisa membaca transaksi');
select pg_temp.expect_error(
  format($q$insert into public.transactions (book_id, type, amount, account_id)
            values (%L, 'expense', 1000, %L)$q$,
         current_setting('test.book_A'), current_setting('test.cash_A')),
  'viewer tidak bisa menambah transaksi', '42501');
delete from public.transactions where book_id = current_setting('test.book_A')::uuid;
reset role;
select pg_temp.check(
  (select count(*) from public.transactions where book_id = current_setting('test.book_A')::uuid) = 1,
  'delete oleh viewer tidak berefek');

-- D (orang luar) tidak melihat apa pun dari buku A
select pg_temp.login('D');
select pg_temp.check((select count(*) from public.books) = 1, 'D hanya melihat bukunya sendiri');
select pg_temp.check(
  (select count(*) from public.transactions) = 0, 'D tidak melihat transaksi buku A');
select pg_temp.check(
  (select count(*) from public.accounts where book_id = current_setting('test.book_A')::uuid) = 0,
  'D tidak melihat akun buku A');
select pg_temp.check(
  (select count(*) from public.profiles) = 1, 'D hanya melihat profilnya sendiri');
select pg_temp.expect_error(
  format($q$insert into public.transactions (book_id, type, amount, account_id)
            values (%L, 'expense', 1000, %L)$q$,
         current_setting('test.book_A'), current_setting('test.cash_A')),
  'orang luar tidak bisa menulis ke buku A', '42501');

-- Anon tidak punya akses
reset role;
set local role anon;
select pg_temp.expect_error('select count(*) from public.transactions', 'anon ditolak', '42501');
reset role;

-- ------------------------------------------------------------
-- T1: integritas data
-- ------------------------------------------------------------
select pg_temp.login('D');
-- D memakai akun milik buku A di bukunya sendiri -> FK komposit menolak
select pg_temp.expect_error(
  format($q$insert into public.transactions (book_id, type, amount, account_id)
            values (%L, 'expense', 1000, %L)$q$,
         current_setting('test.book_D'), current_setting('test.cash_A')),
  'akun dari buku lain ditolak', '23503');

select pg_temp.login('A');
select pg_temp.expect_error(
  format($q$insert into public.transactions (book_id, type, amount, account_id)
            values (%L, 'transfer', 1000, %L)$q$,
         current_setting('test.book_A'), current_setting('test.cash_A')),
  'transfer tanpa akun tujuan ditolak', '23514');
select pg_temp.expect_error(
  format($q$insert into public.transactions (book_id, type, amount, account_id, to_account_id)
            values (%L, 'transfer', 1000, %L, %L)$q$,
         current_setting('test.book_A'), current_setting('test.cash_A'),
         current_setting('test.cash_A')),
  'transfer ke akun yang sama ditolak', '23514');
select pg_temp.expect_error(
  format($q$insert into public.transactions (book_id, type, amount, account_id)
            values (%L, 'expense', 0, %L)$q$,
         current_setting('test.book_A'), current_setting('test.cash_A')),
  'nominal 0 ditolak', '23514');
select pg_temp.expect_error(
  format($q$insert into public.transactions (book_id, type, amount, account_id, category_id)
            values (%L, 'expense', 1000, %L, %L)$q$,
         current_setting('test.book_A'), current_setting('test.cash_A'),
         current_setting('test.cat_salary')),
  'kategori pemasukan untuk pengeluaran ditolak', '23514');
select pg_temp.expect_error(
  format($q$insert into public.categories (book_id, parent_id, kind, name)
            select %L, id, 'expense', 'Cucu' from public.categories
            where book_id = %L and name = 'Jajan'$q$,
         current_setting('test.book_A'), current_setting('test.book_A')),
  'kategori level 3 ditolak', '23514');

-- Saldo: tunai 0 - 25.000 (kopi) ; transfer BCA -> Tunai 100.000 biaya 2.500 ; gaji 5 jt ke BCA
insert into public.transactions (book_id, type, amount, account_id, category_id)
values (current_setting('test.book_A')::uuid, 'income', 5000000,
        current_setting('test.bca_A')::uuid, current_setting('test.cat_salary')::uuid);
insert into public.transactions (book_id, type, amount, fee, account_id, to_account_id)
values (current_setting('test.book_A')::uuid, 'transfer', 100000, 2500,
        current_setting('test.bca_A')::uuid, current_setting('test.cash_A')::uuid);
select pg_temp.check(
  (select balance from public.account_balances
   where account_id = current_setting('test.cash_A')::uuid) = 75000,
  'saldo Tunai = -25.000 + 100.000');
select pg_temp.check(
  (select balance from public.account_balances
   where account_id = current_setting('test.bca_A')::uuid) = 4897500,
  'saldo BCA = 5.000.000 - 100.000 - 2.500');

-- Impor dobel ditolak lewat dedupe_key
insert into public.transactions (book_id, type, amount, account_id, dedupe_key)
values (current_setting('test.book_A')::uuid, 'expense', 1000,
        current_setting('test.cash_A')::uuid, 'k1');
select pg_temp.expect_error(
  format($q$insert into public.transactions (book_id, type, amount, account_id, dedupe_key)
            values (%L, 'expense', 1000, %L, 'k1')$q$,
         current_setting('test.book_A'), current_setting('test.cash_A')),
  'dedupe_key yang sama ditolak', '23505');

-- ------------------------------------------------------------
-- Buku baru dari client: insert ... returning harus bisa dibaca
-- ------------------------------------------------------------
-- Seperti supabase-js .insert().select(): RETURNING ikut dicek policy select
insert into public.books (name) values ('Keluarga') returning name;
select pg_temp.check(
  (select count(*) from public.books) = 2, 'A sekarang punya 2 buku');

-- ------------------------------------------------------------
-- Owner terakhir
-- ------------------------------------------------------------
select pg_temp.expect_error(
  format($q$delete from public.book_members where book_id = %L and user_id = %L$q$,
         current_setting('test.book_A'), current_setting('test.A')),
  'owner terakhir tidak bisa keluar', 'P0001');

-- B keluar sendiri dari buku A
select pg_temp.login('B');
delete from public.book_members
where book_id = current_setting('test.book_A')::uuid and user_id = current_setting('test.B')::uuid;
select pg_temp.check(
  (select count(*) from public.books where id = current_setting('test.book_A')::uuid) = 0,
  'B sudah tidak melihat buku A setelah keluar');

-- Owner menghapus buku: cascade tidak tertahan trigger owner terakhir
select pg_temp.login('A');
delete from public.books where id = current_setting('test.book_A')::uuid;
reset role;
select pg_temp.check(
  (select count(*) from public.transactions where book_id = current_setting('test.book_A')::uuid) = 0,
  'hapus buku menghapus seluruh datanya');

-- Hapus akun user: tidak tertahan trigger owner terakhir
delete from auth.users where id = current_setting('test.D')::uuid;
select pg_temp.check(
  (select count(*) from public.profiles where id = current_setting('test.D')::uuid) = 0,
  'hapus user menghapus profilnya');

select 'SEMUA TEST LOLOS' as hasil;

rollback;
