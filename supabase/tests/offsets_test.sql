-- ============================================================
-- Test fase 10 T6: kaitan pengeluaran ↔ pemasukan (reimburse/utang).
-- Satu transaksi yang di-ROLLBACK. Jalankan sebagai postgres.
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
  v_a uuid := gen_random_uuid();
  v_book uuid;
  v_acc uuid;
  v_cat uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (v_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@test.local', '{"display_name":"Ana"}');
  select id into v_book from public.books where created_by = v_a;
  select id into v_acc from public.accounts where book_id = v_book limit 1;
  select id into v_cat from public.categories where book_id = v_book and kind = 'expense' and parent_id is null limit 1;
  insert into public.transactions (id, book_id, type, occurred_at, amount, account_id, category_id, note) values
    ('00000000-0000-0000-0000-0000000000e1', v_book, 'expense', '2026-10-02 10:00+07', 100000, v_acc, v_cat, 'Berobat'),
    ('00000000-0000-0000-0000-0000000000a1', v_book, 'income',  '2026-10-25 10:00+07', 100000, v_acc, null, 'Reimburse'),
    ('00000000-0000-0000-0000-0000000000e2', v_book, 'expense', '2026-10-05 10:00+07', 100000, v_acc, v_cat, 'Pinjam teman'),
    ('00000000-0000-0000-0000-0000000000a2', v_book, 'income',  '2026-10-10 10:00+07', 60000, v_acc, null, 'Bayar 1'),
    ('00000000-0000-0000-0000-0000000000a3', v_book, 'income',  '2026-11-03 10:00+07', 50000, v_acc, null, 'Bayar 2');
  perform set_config('test.a', v_a::text, false);
  perform set_config('test.book', v_book::text, false);
  perform set_config('test.acc', v_acc::text, false);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.a'), 'role', 'authenticated')::text, true);

create temp table _before as
select balance from public.account_balances where account_id = current_setting('test.acc')::uuid;

-- ---------- reimburse penuh ----------
select public.set_income_offsets('00000000-0000-0000-0000-0000000000a1',
  '[{"expense_id":"00000000-0000-0000-0000-0000000000e1","amount":100000}]');
-- ---------- utang dicicil, sisa 10.000 tetap pemasukan ----------
select public.set_income_offsets('00000000-0000-0000-0000-0000000000a2',
  '[{"expense_id":"00000000-0000-0000-0000-0000000000e2","amount":60000}]');
select public.set_income_offsets('00000000-0000-0000-0000-0000000000a3',
  '[{"expense_id":"00000000-0000-0000-0000-0000000000e2","amount":40000}]');

select pg_temp.check(
  (select expense || '/' || income from public.months_overview(current_setting('test.book')::uuid, 2026) where month = 10) = '0/0',
  'Oktober: pengeluaran dan pemasukan yang dikaitkan tidak dihitung');
select pg_temp.check(
  (select expense || '/' || income from public.months_overview(current_setting('test.book')::uuid, 2026) where month = 11) = '0/10000',
  'November: sisa pembayaran 10.000 tetap pemasukan');
select pg_temp.check(
  not exists (select 1 from public.category_breakdown(current_setting('test.book')::uuid,
    '2026-10-01 00:00+07', '2026-11-01 00:00+07', 'expense')),
  'kategori tidak memuat pengeluaran yang sudah diganti penuh');
select pg_temp.check(
  (select balance from public.account_balances where account_id = current_setting('test.acc')::uuid)
    = (select balance from _before),
  'saldo akun tidak berubah karena kaitan');
select pg_temp.check(
  not exists (select 1 from public.offset_candidates(current_setting('test.book')::uuid)),
  'pengeluaran yang sudah diganti penuh tidak muncul sebagai kandidat');
select pg_temp.check(
  (select remaining from public.offset_candidates(current_setting('test.book')::uuid,
    '00000000-0000-0000-0000-0000000000a3') where id = '00000000-0000-0000-0000-0000000000e2') = 40000,
  'kandidat saat mengedit pemasukan menghitung ulang tanpa kaitannya sendiri');

-- ---------- batas ditolak database ----------
do $$
begin
  perform public.set_income_offsets('00000000-0000-0000-0000-0000000000a3',
    '[{"expense_id":"00000000-0000-0000-0000-0000000000e2","amount":50000}]');
  raise exception 'GAGAL: kaitan melebihi pengeluaran lolos';
exception when check_violation then null;
end;
$$;
do $$
begin
  update public.transactions set amount = 50000 where id = '00000000-0000-0000-0000-0000000000a1';
  raise exception 'GAGAL: nominal di bawah total kaitan lolos';
exception when check_violation then null;
end;
$$;
do $$
begin
  perform public.set_income_offsets('00000000-0000-0000-0000-0000000000e1',
    '[{"expense_id":"00000000-0000-0000-0000-0000000000e2","amount":1}]');
  raise exception 'GAGAL: pengeluaran dipakai sebagai pengganti';
exception when check_violation then null;
end;
$$;

-- ---------- hapus pengganti: kaitan ikut hilang ----------
delete from public.transactions where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.check(
  (select expense from public.months_overview(current_setting('test.book')::uuid, 2026) where month = 10) = 100000,
  'setelah pengganti dihapus, berobat terhitung lagi');

select 'SEMUA TEST LOLOS' as hasil;
rollback;
