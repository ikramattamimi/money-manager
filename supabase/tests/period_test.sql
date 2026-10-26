-- ============================================================
-- Test fase 10 T1: tanggal awal bulan (period_start, period_key, dan RPC per
-- bulan yang memakainya). Satu transaksi yang di-ROLLBACK.
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

-- ---------- batas periode ----------
select pg_temp.check(private.period_start('2026-10-01', 25) = '2026-09-25 00:00+07', 'awal 25: Oktober mulai 25 Sep');
select pg_temp.check(private.period_start('2027-03-01', 31) = '2027-02-28 00:00+07', 'awal 31: Maret mulai hari terakhir Februari');
select pg_temp.check(private.period_key('2026-10-24 23:59:59+07', 25) = '2026-10-01', '24 Okt 23.59 = Oktober');
select pg_temp.check(private.period_key('2026-10-25 00:00+07', 25) = '2026-11-01', '25 Okt 00.00 = November');
select pg_temp.check(private.period_key('2026-10-01 00:00+07', 1) = '2026-10-01', 'awal 1 = bulan kalender');
select pg_temp.check(private.period_key('2027-03-30 23:59+07', 31) = '2027-03-01', '30 Mar dengan awal 31 = Maret');

do $$
declare
  v_a uuid := gen_random_uuid();
  v_book uuid;
  v_acc uuid;
  v_cat uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (v_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@test.local', '{"display_name":"Ana"}');
  select id into v_book from public.books where created_by = v_a;
  update public.books set month_start_day = 25 where id = v_book;
  select id into v_acc from public.accounts where book_id = v_book limit 1;
  select id into v_cat from public.categories where book_id = v_book and kind = 'expense' and parent_id is null limit 1;
  insert into public.transactions (book_id, type, occurred_at, amount, account_id, category_id) values
    (v_book, 'expense', '2026-10-24 23:59+07', 10000, v_acc, v_cat),  -- Oktober (25 Sep – 24 Okt)
    (v_book, 'expense', '2026-10-25 00:00+07', 20000, v_acc, v_cat),  -- November
    (v_book, 'expense', '2026-11-24 12:00+07', 40000, v_acc, v_cat),  -- November
    (v_book, 'income',  '2026-11-25 08:00+07', 80000, v_acc, null);   -- Desember
  insert into public.budgets (book_id, category_id, amount, start_on) values (v_book, v_cat, 100000, '2026-01-01');
  perform set_config('test.a', v_a::text, false);
  perform set_config('test.book', v_book::text, false);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.a'), 'role', 'authenticated')::text, true);

select pg_temp.check(
  (select string_agg(month || ':' || expense || '/' || income, ',' order by month)
   from public.months_overview(current_setting('test.book')::uuid, 2026)) = '10:10000/0,11:60000/0,12:0/80000',
  'months_overview mengikuti awal 25');
select pg_temp.check(
  (select string_agg(month || ':' || expense, ',' order by year, month)
   from public.monthly_trend(current_setting('test.book')::uuid, 2026, 11, 2)) = '10:10000,11:60000',
  'monthly_trend mengikuti awal 25');
select pg_temp.check(
  (select spent from public.budget_status(current_setting('test.book')::uuid, 2026, 11)) = 60000,
  'budget_status November = 25 Okt – 24 Nov');

select 'SEMUA TEST LOLOS' as hasil;
rollback;
