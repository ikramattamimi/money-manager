-- ============================================================
-- Test fase 6 T5: transaksi berulang (post_due_recurring, confirm_recurring,
-- tanggal 31 di bulan pendek, idempoten). Satu transaksi yang di-ROLLBACK.
-- Jalankan sebagai postgres (SQL editor, psql, atau MCP execute_sql).
-- Hasil bergantung pada tanggal hari ini; tanggal aturan dihitung relatif.
-- ============================================================
begin;

create function pg_temp.check(p_ok boolean, p_msg text)
returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'GAGAL: %', p_msg; end if;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Fungsi tanggal murni
select pg_temp.check(private.recurring_next('monthly', 1::smallint, 31::smallint, date '2026-01-31') = date '2026-02-28', '31 Jan → 28 Feb');
select pg_temp.check(private.recurring_next('monthly', 1::smallint, 31::smallint, date '2026-02-28') = date '2026-03-31', '28 Feb → 31 Mar (jangkar 31)');
select pg_temp.check(private.recurring_next('monthly', 1::smallint, 31::smallint, date '2028-01-31') = date '2028-02-29', 'kabisat: 29 Feb');
select pg_temp.check(private.recurring_next('yearly', 1::smallint, 29::smallint, date '2028-02-29') = date '2029-02-28', 'tahunan 29 Feb → 28 Feb');
select pg_temp.check(private.recurring_next('weekly', 2::smallint, null, date '2026-10-01') = date '2026-10-15', 'dua mingguan');
select pg_temp.check(private.recurring_next('daily', 1::smallint, null, date '2026-12-31') = date '2027-01-01', 'harian lewat tahun');

do $$
declare
  v_uid uuid := gen_random_uuid();
  v_book uuid;
  v_cash uuid;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_start date;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recur@test.local', '{}');
  select id into v_book from public.books where created_by = v_uid;
  select id into v_cash from public.accounts where book_id = v_book limit 1;

  -- Bulanan tanggal 31, mulai 31 Januari tahun lalu: semua bulan sampai hari ini
  v_start := make_date(extract(year from v_today)::int - 1, 1, 31);
  insert into public.recurring_rules (book_id, name, type, amount, account_id, frequency, start_on, next_run_on, auto_post, created_by)
  values (v_book, 'Kos', 'expense', 1000000, v_cash, 'monthly', v_start, v_start, true, v_uid);

  -- Mingguan perlu konfirmasi, mulai 14 hari lalu: 3 draf (hari -14, -7, 0)
  insert into public.recurring_rules (book_id, name, type, amount, account_id, frequency, start_on, next_run_on, auto_post, created_by)
  values (v_book, 'Laundry', 'expense', 30000, v_cash, 'weekly', v_today - 14, v_today - 14, false, v_uid);

  -- Sudah berakhir kemarin: tidak boleh jalan hari ini
  insert into public.recurring_rules (book_id, name, type, amount, account_id, frequency, start_on, next_run_on, end_on, auto_post, created_by)
  values (v_book, 'Cicilan', 'expense', 500000, v_cash, 'daily', v_today - 2, v_today - 2, v_today - 1, true, v_uid);

  perform set_config('test.uid', v_uid::text, false);
  perform set_config('test.book', v_book::text, false);
end;
$$;

-- pg_cron (tanpa login): semua buku
select pg_temp.check(public.post_due_recurring() >= 1, 'cron mencatat transaksi');

do $$
declare
  v_book uuid := current_setting('test.book')::uuid;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_kos integer;
  v_expected integer;
  v_bad integer;
begin
  -- Jumlah bulan dari Januari tahun lalu sampai bulan ini, dikurangi bulan ini
  -- kalau tanggal jatuh temponya (31 atau tanggal terakhir) belum lewat
  v_expected := 12 + extract(month from v_today)::int;
  if extract(day from v_today) < least(31, extract(day from (date_trunc('month', v_today::timestamp) + interval '1 month - 1 day'))) then
    v_expected := v_expected - 1;
  end if;
  select count(*) into v_kos from public.transactions t
  join public.recurring_rules r on r.id = t.recurring_rule_id
  where t.book_id = v_book and r.name = 'Kos';
  perform pg_temp.check(v_kos = v_expected, format('Kos tercatat %s kali, harusnya %s', v_kos, v_expected));

  -- Setiap transaksi Kos jatuh di tanggal 31 atau tanggal terakhir bulan itu
  select count(*) into v_bad from public.transactions t
  join public.recurring_rules r on r.id = t.recurring_rule_id
  where r.name = 'Kos' and r.book_id = v_book
    and extract(day from (t.occurred_at at time zone 'Asia/Jakarta'))::int
        <> least(31, extract(day from (date_trunc('month', (t.occurred_at at time zone 'Asia/Jakarta')) + interval '1 month - 1 day'))::int);
  perform pg_temp.check(v_bad = 0, 'tanggal 31 jadi tanggal terakhir di bulan pendek');
  perform pg_temp.check(
    (select bool_and(source = 'recurring' and occurred_at::time is not null) from public.transactions where book_id = v_book),
    'sumber transaksi recurring');

  perform pg_temp.check(
    (select count(*) from public.recurring_pending where book_id = v_book) = 3, '3 draf Laundry menunggu konfirmasi');
  perform pg_temp.check(
    not exists (select 1 from public.transactions t join public.recurring_rules r on r.id = t.recurring_rule_id
                where r.book_id = v_book and r.name = 'Laundry'),
    'draf belum jadi transaksi');
  perform pg_temp.check(
    (select count(*) from public.transactions t join public.recurring_rules r on r.id = t.recurring_rule_id
      where r.name = 'Cicilan' and r.book_id = v_book) = 2, 'Cicilan hanya sampai tanggal akhir');
  perform pg_temp.check(
    not (select active from public.recurring_rules where name = 'Cicilan' and book_id = v_book), 'aturan yang berakhir nonaktif');
end;
$$;

-- Dijalankan lagi di hari yang sama: tidak ada yang bertambah
select pg_temp.check(public.post_due_recurring() = 0, 'jalan kedua tidak menambah transaksi');
select pg_temp.check(
  (select count(*) from public.recurring_pending where book_id = current_setting('test.book')::uuid) = 3,
  'jalan kedua tidak menambah draf');

-- Dari app sebagai user: konfirmasi draf dengan nominal lain, lewati satu draf
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.uid'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_book uuid := current_setting('test.book')::uuid;
  v_pending uuid;
  v_tx uuid;
begin
  select id into v_pending from public.recurring_pending where book_id = v_book order by due_on limit 1;
  v_tx := public.confirm_recurring(v_pending, 35000);
  perform pg_temp.check((select amount from public.transactions where id = v_tx) = 35000, 'konfirmasi dengan nominal baru');
  perform pg_temp.check(not exists (select 1 from public.recurring_pending where id = v_pending), 'draf hilang setelah dikonfirmasi');

  select id into v_pending from public.recurring_pending where book_id = v_book order by due_on limit 1;
  delete from public.recurring_pending where id = v_pending;
  perform pg_temp.check(
    (select count(*) from public.recurring_pending where book_id = v_book) = 1, 'lewati: tinggal 1 draf');

  perform pg_temp.check(public.post_due_recurring(v_book) = 0, 'app memanggil untuk bukunya sendiri');
end;
$$;

do $$
begin
  perform public.post_due_recurring();
  raise exception 'GAGAL: user bisa menjalankan untuk semua buku';
exception when insufficient_privilege then
  null;
end;
$$;

select 'SEMUA TEST LOLOS' as hasil;
rollback;
