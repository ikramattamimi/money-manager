-- ============================================================
-- Test fase 9: berbagi buku (book_member_list, invite_preview, peran,
-- pemilik terakhir). Satu transaksi yang di-ROLLBACK.
-- Jalankan sebagai postgres (SQL editor, psql, atau MCP execute_sql).
-- ============================================================
begin;

create function pg_temp.check(p_ok boolean, p_msg text)
returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'GAGAL: %', p_msg; end if;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Masuk sebagai user tertentu (klaim sub + email seperti JWT Supabase)
create function pg_temp.login(p_uid uuid, p_email text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'email', p_email)::text, true);
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

do $$
declare
  v_a uuid := gen_random_uuid();  -- pemilik
  v_b uuid := gen_random_uuid();  -- editor
  v_c uuid := gen_random_uuid();  -- viewer
  v_d uuid := gen_random_uuid();  -- diundang
  v_book uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (v_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@test.local', '{"display_name":"Ana"}'),
    (v_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'budi@test.local', '{"display_name":"Budi"}'),
    (v_c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cici@test.local', '{"display_name":"Cici"}'),
    (v_d, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dodi@test.local', '{"display_name":"Dodi"}');
  select id into v_book from public.books where created_by = v_a;
  insert into public.book_members (book_id, user_id, role) values (v_book, v_b, 'editor'), (v_book, v_c, 'viewer');
  perform set_config('test.a', v_a::text, false);
  perform set_config('test.b', v_b::text, false);
  perform set_config('test.c', v_c::text, false);
  perform set_config('test.d', v_d::text, false);
  perform set_config('test.book', v_book::text, false);
end;
$$;

set local role authenticated;

-- ---------- pemilik: semua email terlihat, bisa mengundang ----------
select pg_temp.login(current_setting('test.a')::uuid, 'ana@test.local');
select pg_temp.check(
  (select count(*) from public.book_member_list(current_setting('test.book')::uuid) where email is not null) = 3,
  'pemilik melihat email semua anggota');
select pg_temp.check(
  (select string_agg(display_name || ':' || role, ',') from public.book_member_list(current_setting('test.book')::uuid))
    = 'Ana:owner,Budi:editor,Cici:viewer',
  'urutan pemilik, editor, viewer');
do $$
declare v_invite public.book_invites;
begin
  v_invite := public.create_invite(current_setting('test.book')::uuid, 'Dodi@Test.local', 'editor');
  perform set_config('test.token', v_invite.token, false);
end;
$$;

-- ---------- viewer: tidak melihat email orang lain ----------
select pg_temp.login(current_setting('test.c')::uuid, 'cici@test.local');
select pg_temp.check(
  (select count(*) from public.book_member_list(current_setting('test.book')::uuid) where email is not null) = 1,
  'viewer hanya melihat emailnya sendiri');
select pg_temp.check(
  (select email from public.book_member_list(current_setting('test.book')::uuid) where is_me) = 'cici@test.local',
  'viewer melihat emailnya sendiri');
select pg_temp.check(
  (select email_hint from public.invite_preview(current_setting('test.token'))) = 'do•••@test.local'
    and not (select for_me from public.invite_preview(current_setting('test.token'))),
  'undangan orang lain: email tersamar');

-- ---------- penerima: pratinjau lalu terima ----------
select pg_temp.login(current_setting('test.d')::uuid, 'dodi@test.local');
select pg_temp.check(
  (select book_name || '|' || role || '|' || invited_by_name || '|' || status from public.invite_preview(current_setting('test.token')))
    = 'Pribadi|editor|Ana|open',
  'pratinjau undangan untuk penerima');
select pg_temp.check((select for_me from public.invite_preview(current_setting('test.token'))), 'undangan untuk saya');
select pg_temp.check(not exists (select 1 from public.invite_preview('token-salah')), 'token salah: kosong, tidak error');
select pg_temp.check(public.accept_invite(current_setting('test.token')) = current_setting('test.book')::uuid, 'terima undangan');
select pg_temp.check(
  (select status from public.invite_preview(current_setting('test.token'))) = 'accepted', 'status jadi accepted');

-- ---------- turunkan editor jadi viewer: insert ditolak ----------
select pg_temp.login(current_setting('test.a')::uuid, 'ana@test.local');
update public.book_members set role = 'viewer'
where book_id = current_setting('test.book')::uuid and user_id = current_setting('test.b')::uuid;

select pg_temp.login(current_setting('test.b')::uuid, 'budi@test.local');
do $$
begin
  insert into public.transactions (book_id, type, amount, account_id)
  select current_setting('test.book')::uuid, 'expense', 1000, id
  from public.accounts where book_id = current_setting('test.book')::uuid limit 1;
  raise exception 'GAGAL: viewer bisa menambah transaksi';
exception when insufficient_privilege then null;
end;
$$;

-- ---------- pemilik terakhir tidak bisa keluar / turun ----------
select pg_temp.login(current_setting('test.a')::uuid, 'ana@test.local');
do $$
begin
  delete from public.book_members
  where book_id = current_setting('test.book')::uuid and user_id = current_setting('test.a')::uuid;
  raise exception 'GAGAL: pemilik terakhir bisa keluar';
exception when raise_exception then
  if sqlerrm like 'GAGAL%' then raise; end if;
end;
$$;

-- ---------- anggota keluar sendiri ----------
select pg_temp.login(current_setting('test.c')::uuid, 'cici@test.local');
delete from public.book_members
where book_id = current_setting('test.book')::uuid and user_id = current_setting('test.c')::uuid;
select pg_temp.check(
  not exists (select 1 from public.books where id = current_setting('test.book')::uuid), 'setelah keluar, buku tidak terlihat');

select 'SEMUA TEST LOLOS' as hasil;
rollback;
