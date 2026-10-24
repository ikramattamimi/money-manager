-- ============================================================
-- Test RPC fase 6: suggest_from_note. Satu transaksi yang di-ROLLBACK.
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

do $$
declare
  v_uid uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_book uuid;
  v_cash uuid;
  v_gopay uuid;
  v_shop uuid;
  v_food uuid;
  v_sub uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  values
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'suggest@test.local', '{}'),
    (v_other, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lain@test.local', '{}');
  select id into v_book from public.books where created_by = v_uid;
  select id into v_cash from public.accounts where book_id = v_book limit 1;
  insert into public.accounts (book_id, group_id, name)
  select v_book, id, 'Gopay' from public.account_groups where book_id = v_book and kind = 'ewallet'
  returning id into v_gopay;
  select id into v_shop from public.categories where book_id = v_book and name = 'Belanja' and parent_id is null;
  select id into v_food from public.categories where book_id = v_book and name = 'Makan & Minum' and parent_id is null;
  select id into v_sub from public.categories where book_id = v_book and name ilike 'Tagihan%' and parent_id is null;

  -- indomaret: 4x Belanja (baru), 3x Makan (lama) → Belanja menang karena lebih baru
  insert into public.transactions (book_id, type, amount, account_id, category_id, note, occurred_at)
  select v_book, 'expense', 20000 + g * 1000, v_gopay, v_shop, 'Indomaret', now() - (g || ' days')::interval
  from generate_series(1, 4) g;
  insert into public.transactions (book_id, type, amount, account_id, category_id, note, occurred_at)
  select v_book, 'expense', 15000, v_cash, v_food, 'indomaret point', now() - ((400 + g) || ' days')::interval
  from generate_series(1, 3) g;
  -- spotify: nominal sama berulang
  insert into public.transactions (book_id, type, amount, account_id, category_id, note, occurred_at)
  select v_book, 'expense', 15000, v_cash, v_sub, 'spotify', now() - ((g * 30) || ' days')::interval
  from generate_series(1, 3) g;

  perform set_config('test.uid', v_uid::text, false);
  perform set_config('test.other', v_other::text, false);
  perform set_config('test.book', v_book::text, false);
  perform set_config('test.gopay', v_gopay::text, false);
  perform set_config('test.shop', v_shop::text, false);
  perform set_config('test.sub', v_sub::text, false);
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.uid'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_book uuid := current_setting('test.book')::uuid;
  r record;
begin
  select * into r from public.suggest_from_note(v_book, 'indomaret');
  perform pg_temp.check(r.category_id = current_setting('test.shop')::uuid, 'indomaret → Belanja');
  perform pg_temp.check(r.account_id = current_setting('test.gopay')::uuid, 'indomaret → Gopay');
  perform pg_temp.check(r.type = 'expense', 'jenis pengeluaran');
  perform pg_temp.check(r.amount is null, 'nominal indomaret beragam: tidak disarankan');

  select * into r from public.suggest_from_note(v_book, 'INDOMRT');
  perform pg_temp.check(r.category_id = current_setting('test.shop')::uuid, 'salah ketik dan huruf besar tetap cocok');

  select * into r from public.suggest_from_note(v_book, 'spotify');
  perform pg_temp.check(r.category_id = current_setting('test.sub')::uuid, 'spotify → Tagihan');
  perform pg_temp.check(r.amount = 15000, 'nominal spotify berulang disarankan');

  perform pg_temp.check(
    not exists (select 1 from public.suggest_from_note(v_book, 'martabak')), 'tidak ada riwayat → kosong');
  perform pg_temp.check(
    not exists (select 1 from public.suggest_from_note(v_book, 'in')), 'teks < 3 huruf → kosong');
end;
$$;

-- User lain tidak bisa membaca riwayat buku ini
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.other'), 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.check(
  not exists (select 1 from public.suggest_from_note(current_setting('test.book')::uuid, 'indomaret')),
  'RLS: user lain tidak mendapat saran');

select 'SEMUA TEST LOLOS' as hasil;
rollback;
