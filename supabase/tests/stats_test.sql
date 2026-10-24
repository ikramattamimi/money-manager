-- ============================================================
-- Test RPC fase 7: category_breakdown, monthly_trend, budget_status,
-- search_transactions. Satu transaksi yang di-ROLLBACK.
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
  v_book uuid;
  v_cash uuid;
  v_bank uuid;
  v_food uuid;
  v_coffee uuid;
  v_shop uuid;
  v_salary uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stats@test.local', '{}');
  select id into v_book from public.books where created_by = v_uid;
  select id into v_cash from public.accounts where book_id = v_book limit 1;
  insert into public.accounts (book_id, group_id, name)
  select v_book, id, 'Bank' from public.account_groups where book_id = v_book and kind = 'bank'
  returning id into v_bank;
  select id into v_food from public.categories where book_id = v_book and name = 'Makan & Minum' and parent_id is null;
  select id into v_coffee from public.categories where book_id = v_book and name = 'Kopi';
  select id into v_shop from public.categories where book_id = v_book and name = 'Belanja' and parent_id is null;
  select id into v_salary from public.categories where book_id = v_book and kind = 'income' and parent_id is null limit 1;

  -- Oktober 2026 (WIB): Makan 1.000.000 + Kopi 200.000 = 1.200.000; Belanja 300.000 (shopee)
  insert into public.transactions (book_id, type, amount, account_id, category_id, note, occurred_at) values
    (v_book, 'expense', 1000000, v_cash, v_food, 'makan', '2026-10-05 12:00+07'),
    (v_book, 'expense', 200000, v_cash, v_coffee, 'kopi', '2026-10-31 23:59+07'),
    (v_book, 'expense', 300000, v_bank, v_shop, 'Shopee casing', '2026-10-10 10:00+07'),
    (v_book, 'income', 5000000, v_bank, v_salary, 'gaji', '2026-10-25 09:00+07'),
    -- Di luar Oktober WIB (1 Nov 00.30 WIB = 31 Okt 17.30 UTC)
    (v_book, 'expense', 50000, v_cash, v_food, 'makan', '2026-11-01 00:30+07'),
    -- September: Makan 1.400.000 (untuk carry over)
    (v_book, 'expense', 1400000, v_cash, v_food, 'makan', '2026-09-15 12:00+07'),
    (v_book, 'expense', 120000, v_bank, v_shop, 'shopeefood', '2026-09-20 12:00+07');
  -- Transfer dan koreksi saldo tidak dihitung
  insert into public.transactions (book_id, type, amount, account_id, to_account_id, occurred_at)
  values (v_book, 'transfer', 777000, v_bank, v_cash, '2026-10-12 10:00+07');
  insert into public.transactions (book_id, type, amount, account_id, is_adjustment, note, occurred_at)
  values (v_book, 'expense', 999000, v_cash, true, 'Koreksi saldo', '2026-10-13 10:00+07');

  -- Budget Makan (induk) 1.500.000 sejak September dengan carry over; total 2.000.000
  insert into public.budgets (book_id, category_id, amount, start_on, carry_over) values
    (v_book, v_food, 1500000, '2026-09-01', true),
    (v_book, null, 2000000, '2026-10-01', false);

  perform set_config('test.uid', v_uid::text, false);
  perform set_config('test.book', v_book::text, false);
  perform set_config('test.food', v_food::text, false);
  perform set_config('test.cash', v_cash::text, false);
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.uid'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_book uuid := current_setting('test.book')::uuid;
  v_food uuid := current_setting('test.food')::uuid;
  v_from timestamptz := '2026-10-01 00:00+07';
  v_to timestamptz := '2026-11-01 00:00+07';
  r record;
begin
  -- ---------- breakdown ----------
  perform pg_temp.check(
    (select sum(total) from public.category_breakdown(v_book, v_from, v_to, 'expense')) = 1500000,
    'total breakdown Oktober = 1.500.000 (tanpa transfer, koreksi, 1 Nov)');
  perform pg_temp.check(
    (select sum(total) from public.category_breakdown(v_book, v_from, v_to, 'expense') where root_id = v_food) = 1200000,
    'Makan & Minum termasuk Kopi = 1.200.000');
  perform pg_temp.check(
    (select sum(total) from public.category_breakdown(v_book, v_from, v_to, 'expense'))
      = (select expense from public.months_overview(v_book, 2026) where month = 10),
    'breakdown = ringkasan bulan di tab Transaksi');
  perform pg_temp.check(
    not exists (select 1 from public.category_breakdown(v_book, v_from, v_to, 'transfer')),
    'transfer tidak punya breakdown');

  -- ---------- tren ----------
  perform pg_temp.check((select count(*) from public.monthly_trend(v_book, 2026, 10, 6)) = 6, '6 bulan');
  select * into r from public.monthly_trend(v_book, 2026, 10, 6) where month = 10;
  perform pg_temp.check(r.expense = 1500000 and r.income = 5000000, 'tren Oktober');
  select * into r from public.monthly_trend(v_book, 2026, 10, 6) where month = 5;
  perform pg_temp.check(r.expense = 0 and r.income = 0, 'bulan kosong tetap ada dengan 0');
  perform pg_temp.check(
    (select sum(expense) from public.monthly_trend(v_book, 2026, 10, 6, v_food)) = 1400000 + 1200000,
    'tren per kategori termasuk subkategori');

  -- ---------- budget ----------
  select * into r from public.budget_status(v_book, 2026, 10) where category_id = v_food;
  perform pg_temp.check(r.amount = 1500000 and r.spent = 1200000, 'budget Makan: 1.200.000 dari 1.500.000');
  perform pg_temp.check(round(100.0 * r.spent / r.amount) = 80, 'budget Makan 80%');
  perform pg_temp.check(r.amount - r.spent = 300000, 'sisa 300.000 (tanpa carry over)');
  perform pg_temp.check(r.carried = 100000, 'carry over: sisa September 1.500.000 - 1.400.000');
  select * into r from public.budget_status(v_book, 2026, 10) where category_id is null;
  perform pg_temp.check(r.spent = 1500000 and r.carried = 0, 'budget total menghitung semua pengeluaran');
  perform pg_temp.check(
    (select count(*) from public.budget_status(v_book, 2026, 9)) = 1, 'budget total belum berlaku di September');

  -- ---------- pencarian ----------
  select * into r from public.search_transactions(v_book, 'shopee') limit 1;
  perform pg_temp.check(r.total_count = 2 and r.total_expense = 420000, 'cari shopee: 2 transaksi, 420.000');
  perform pg_temp.check(
    r.total_count = (select count(*) from public.transactions where book_id = v_book and (note ilike '%shopee%' or description ilike '%shopee%')),
    'cari shopee sama dengan query manual');
  select * into r from public.search_transactions(v_book, 'SHOPE', p_from => v_from, p_to => v_to) limit 1;
  perform pg_temp.check(r.total_count = 1, 'filter tanggal + huruf besar');
  select * into r from public.search_transactions(v_book, null, p_category_id => v_food) limit 1;
  perform pg_temp.check(r.total_count = 4, 'filter kategori induk mencakup Kopi');
  select * into r from public.search_transactions(v_book, null, p_min => 1000000) limit 1;
  perform pg_temp.check(r.total_count = 3, 'filter nominal minimal: 1jt, 1,4jt, 5jt');
  select * into r from public.search_transactions(v_book, null, p_type => 'transfer', p_account_id => current_setting('test.cash')::uuid) limit 1;
  perform pg_temp.check(r.total_count = 1, 'filter akun mencakup akun tujuan transfer');
  perform pg_temp.check(
    not exists (select 1 from public.search_transactions(v_book, 'tidakada')), 'tanpa hasil');
end;
$$;

select 'SEMUA TEST LOLOS' as hasil;
rollback;
