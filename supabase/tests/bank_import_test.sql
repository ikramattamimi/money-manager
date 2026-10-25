-- ============================================================
-- Test fase 8: commit_bank_import (batch bank_statement, source import_bank,
-- duplikat dilewati, viewer ditolak). Satu transaksi yang di-ROLLBACK.
-- Jalankan sebagai postgres (SQL editor, psql, atau MCP execute_sql).
-- ============================================================
begin;

create function pg_temp.check(p_ok boolean, p_msg text)
returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'GAGAL: %', p_msg; end if;
end;
$$;

create function pg_temp.login(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

do $$
declare
  v_a uuid := gen_random_uuid();  -- pemilik
  v_c uuid := gen_random_uuid();  -- viewer
  v_book uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (v_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@test.local', '{"display_name":"Ana"}'),
    (v_c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cici@test.local', '{"display_name":"Cici"}');
  select id into v_book from public.books where created_by = v_a;
  insert into public.book_members (book_id, user_id, role) values (v_book, v_c, 'viewer');
  insert into public.accounts (book_id, group_id, name)
  select v_book, id, 'Jago' from public.account_groups where book_id = v_book and kind = 'bank';
  perform set_config('test.a', v_a::text, false);
  perform set_config('test.c', v_c::text, false);
  perform set_config('test.book', v_book::text, false);
  perform set_config('test.acc1', (select id::text from public.accounts where book_id = v_book order by sort, name limit 1), false);
  perform set_config('test.acc2', (select id::text from public.accounts where book_id = v_book order by sort, name offset 1 limit 1), false);
  perform set_config('test.cat', (select id::text from public.categories where book_id = v_book and kind = 'expense' limit 1), false);
end;
$$;

set local role authenticated;

create temp table _payload as
select jsonb_build_object('filename', 'mutasi.pdf', 'transactions', jsonb_build_array(
  jsonb_build_object('occurred_at', '2026-10-01T12:00:00+07:00', 'type', 'expense', 'amount', 42000,
    'account_id', current_setting('test.acc1'), 'category_id', current_setting('test.cat'),
    'note', 'Toko Kopi', 'description', 'Toko Kopi · Pembayaran', 'dedupe_key', 'bk:satu'),
  jsonb_build_object('occurred_at', '2026-10-03T12:00:00+07:00', 'type', 'transfer', 'amount', 200000,
    'account_id', current_setting('test.acc1'), 'to_account_id', current_setting('test.acc2'),
    'category_id', current_setting('test.cat'), 'note', 'Jago', 'dedupe_key', 'bk:dua'),
  -- Kunci tanpa awalan bk: ditolak diam-diam
  jsonb_build_object('occurred_at', '2026-10-03T12:00:00+07:00', 'type', 'income', 'amount', 1,
    'account_id', current_setting('test.acc1'), 'dedupe_key', 'rb:lain')
)) as p;
grant select on _payload to authenticated;

-- ---------- viewer ditolak ----------
select pg_temp.login(current_setting('test.c')::uuid);
do $$
begin
  perform public.commit_bank_import(current_setting('test.book')::uuid, (select p from _payload));
  raise exception 'GAGAL: viewer bisa menyimpan impor';
exception when insufficient_privilege then null;
end;
$$;

-- ---------- pemilik menyimpan ----------
select pg_temp.login(current_setting('test.a')::uuid);
select pg_temp.check(
  (public.commit_bank_import(current_setting('test.book')::uuid, (select p from _payload)) ->> 'inserted')::int = 2,
  'dua baris tersimpan');
select pg_temp.check(
  (select count(*) from public.transactions t join public.import_batches b on b.id = t.import_batch_id
   where t.book_id = current_setting('test.book')::uuid and t.source = 'import_bank'
     and b.source = 'bank_statement' and b.row_count = 2) = 2,
  'batch bank_statement dengan source import_bank');
select pg_temp.check(
  (select category_id is null and to_account_id = current_setting('test.acc2')::uuid
   from public.transactions where dedupe_key = 'bk:dua'),
  'transfer tanpa kategori');

-- ---------- impor ulang: semua duplikat, tidak ada batch baru ----------
select pg_temp.check(
  (select r ->> 'inserted' = '0' and r ->> 'batchId' is null
   from public.commit_bank_import(current_setting('test.book')::uuid, (select p from _payload)) r),
  'impor ulang dilewati');
select pg_temp.check(
  (select count(*) from public.import_batches where book_id = current_setting('test.book')::uuid) = 1,
  'tidak ada batch kosong');

select 'SEMUA TEST LOLOS' as hasil;
rollback;
