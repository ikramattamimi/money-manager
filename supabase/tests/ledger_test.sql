-- ============================================================
-- Test RPC fase 4: months_overview, account_ledger, adjust_balance,
-- dan ikon/warna kategori default. Satu transaksi yang di-ROLLBACK.
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
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ledger@test.local', '{}');
  perform set_config('test.uid', v_uid::text, false);
  perform set_config('test.book', (select id::text from public.books where created_by = v_uid), false);
end;
$$;

-- Kategori default buku baru punya ikon dan warna
select pg_temp.check(
  (select count(*) from public.categories where book_id = current_setting('test.book')::uuid and icon = 'tag') = 0,
  'semua kategori default punya ikon');
select pg_temp.check(
  (select icon || '|' || tone from public.categories
   where book_id = current_setting('test.book')::uuid and name = 'Parkir') = 'square-parking|r5',
  'subkategori mengikuti warna induk, ikon sendiri');

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.uid'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_book uuid := current_setting('test.book')::uuid;
  v_cash uuid;
  v_bca uuid;
begin
  select id into v_cash from public.accounts where book_id = v_book and name = 'Tunai';
  insert into public.accounts (book_id, group_id, name)
  select v_book, id, 'BCA' from public.account_groups where book_id = v_book and kind = 'bank'
  returning id into v_bca;
  perform set_config('test.cash', v_cash::text, false);
  perform set_config('test.bca', v_bca::text, false);

  insert into public.transactions (book_id, type, amount, account_id, occurred_at)
  values (v_book, 'income', 5000000, v_bca, '2026-10-01 09:00+07');
  insert into public.transactions (book_id, type, amount, fee, account_id, to_account_id, occurred_at)
  values (v_book, 'transfer', 100000, 2500, v_bca, v_cash, '2026-10-02 10:00+07');
  insert into public.transactions (book_id, type, amount, account_id, occurred_at)
  values (v_book, 'expense', 25000, v_cash, '2026-10-03 12:00+07');
  -- 31 Okt 23:30 WIB = 31 Okt 16:30 UTC: tetap bulan Oktober
  insert into public.transactions (book_id, type, amount, account_id, occurred_at)
  values (v_book, 'expense', 10000, v_cash, '2026-10-31 23:30+07');
  -- 1 Nov 00:30 WIB = 31 Okt 17:30 UTC: harus masuk November
  insert into public.transactions (book_id, type, amount, account_id, occurred_at)
  values (v_book, 'expense', 7000, v_cash, '2026-11-01 00:30+07');
end;
$$;

-- Saldo tunai: +100.000 - 25.000 - 10.000 - 7.000 = 58.000
select pg_temp.check(
  (select balance from public.account_balances where account_id = current_setting('test.cash')::uuid) = 58000,
  'saldo tunai sebelum koreksi');

-- Koreksi ke 60.000: transaksi pemasukan 2.000 bertanda is_adjustment
select pg_temp.check(
  (select (t).amount = 2000 and (t).type = 'income' and (t).is_adjustment
   from (select public.adjust_balance(current_setting('test.cash')::uuid, 60000) as t) x),
  'koreksi membuat transaksi selisih');
select pg_temp.check(
  (select balance from public.account_balances where account_id = current_setting('test.cash')::uuid) = 60000,
  'saldo sama dengan angka koreksi');
select pg_temp.check(
  public.adjust_balance(current_setting('test.cash')::uuid, 60000) is null,
  'koreksi ke saldo yang sama tidak membuat transaksi');

-- Bulanan: koreksi tidak dihitung, batas bulan WIB
select pg_temp.check(
  (select income = 5000000 and expense = 35000 from public.months_overview(current_setting('test.book')::uuid, 2026) where month = 10),
  'Oktober: masuk 5 jt, keluar 35 rb (tanpa koreksi)');
select pg_temp.check(
  (select expense = 7000 from public.months_overview(current_setting('test.book')::uuid, 2026) where month = 11),
  'transaksi 1 Nov 00:30 WIB masuk November');

-- Saldo berjalan: baris terbaru = saldo akun saat ini
select pg_temp.check(
  (select balance_after from public.account_ledger(current_setting('test.cash')::uuid) limit 1) = 60000,
  'saldo berjalan tunai di baris teratas = saldo akun');
select pg_temp.check(
  (select balance_after from public.account_ledger(current_setting('test.bca')::uuid) limit 1)
    = (select balance from public.account_balances where account_id = current_setting('test.bca')::uuid),
  'saldo berjalan BCA = saldo akun (transfer + biaya)');
select pg_temp.check(
  (select delta from public.account_ledger(current_setting('test.bca')::uuid) where type = 'transfer') = -102500,
  'transfer keluar BCA mengurangi jumlah + biaya');

select 'SEMUA TEST LOLOS' as hasil;
rollback;
