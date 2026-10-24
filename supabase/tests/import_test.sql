-- ============================================================
-- Test RPC fase 5: commit_import, import_existing_keys, revert_import.
-- Satu transaksi yang di-ROLLBACK. Jalankan sebagai postgres (SQL editor,
-- psql, atau MCP execute_sql).
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
  v_viewer uuid := gen_random_uuid();
  v_book uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  values
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'import@test.local', '{}'),
    (v_viewer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@test.local', '{}');
  select id into v_book from public.books where created_by = v_uid;
  insert into public.book_members (book_id, user_id, role) values (v_book, v_viewer, 'viewer');
  perform set_config('test.uid', v_uid::text, false);
  perform set_config('test.viewer', v_viewer::text, false);
  perform set_config('test.book', v_book::text, false);
  -- Akun "Tunai" bawaan buku baru dipakai lewat nama "TUNAI" (tidak peka huruf besar/kecil)
  perform set_config('test.payload', jsonb_build_object(
    'filename', 'realbyte.xlsx',
    'accounts', jsonb_build_array(
      jsonb_build_object('name', 'TUNAI', 'kind', 'cash'),
      jsonb_build_object('name', 'Bank Uji', 'kind', 'bank'),
      jsonb_build_object('name', 'Amplop', 'kind', 'other')
    ),
    'categories', jsonb_build_array(
      jsonb_build_object('key', 'expense:food', 'kind', 'expense', 'name', 'Food', 'emoji', '🥘',
        'icon', 'utensils', 'tone', 'r1', 'parent_key', null),
      jsonb_build_object('key', 'expense:food/snacks', 'kind', 'expense', 'name', 'Snacks', 'emoji', '🍟',
        'icon', 'cookie', 'tone', 'r1', 'parent_key', 'expense:food'),
      jsonb_build_object('key', 'income:salary', 'kind', 'income', 'name', 'Salary', 'emoji', '💰',
        'icon', 'briefcase', 'tone', 'r2', 'parent_key', null)
    ),
    'transactions', jsonb_build_array(
      jsonb_build_object('occurred_at', '2026-10-01T03:00:00Z', 'type', 'income', 'amount', 1000000,
        'account', 'Bank Uji', 'category', 'income:salary', 'note', 'gaji', 'dedupe_key', 'rb:t1'),
      jsonb_build_object('occurred_at', '2026-10-02T03:00:00Z', 'type', 'expense', 'amount', 25000,
        'account', 'tunai', 'category', 'expense:food/snacks', 'note', 'kopi', 'dedupe_key', 'rb:t2'),
      jsonb_build_object('occurred_at', '2026-10-03T03:00:00Z', 'type', 'transfer', 'amount', 100000,
        'account', 'Bank Uji', 'to_account', 'Amplop', 'dedupe_key', 'rb:t3'),
      jsonb_build_object('occurred_at', '2026-10-04T03:00:00Z', 'type', 'expense', 'amount', 5000,
        'account', 'Tunai', 'is_adjustment', true, 'note', 'Koreksi saldo', 'dedupe_key', 'rb:t4')
    )
  )::text, false);
end;
$$;

-- Viewer tidak boleh mengimpor
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.viewer'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  perform public.commit_import(current_setting('test.book')::uuid, current_setting('test.payload')::jsonb);
  raise exception 'GAGAL: viewer bisa mengimpor';
exception when insufficient_privilege then
  null;
end;
$$;
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.uid'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_book uuid := current_setting('test.book')::uuid;
  v_payload jsonb := current_setting('test.payload')::jsonb;
  v_first jsonb;
  v_second jsonb;
  v_groups integer;
begin
  select count(*) into v_groups from public.account_groups where book_id = v_book;
  v_first := public.commit_import(v_book, v_payload);
  perform pg_temp.check((v_first ->> 'inserted')::int = 4, 'impor pertama menambah 4 transaksi');
  perform pg_temp.check((v_first ->> 'accountsCreated')::int = 2, '2 akun baru (Tunai sudah ada)');
  perform pg_temp.check((v_first ->> 'categoriesCreated')::int = 3, '3 kategori baru');
  perform pg_temp.check(
    (select count(*) from public.account_groups where book_id = v_book) = v_groups + 1,
    'grup "Lainnya" dibuat untuk akun kind other');
  perform pg_temp.check(
    (select count(*) from public.accounts where book_id = v_book and lower(name) = 'tunai') = 1,
    'akun Tunai tidak diduplikasi');
  perform pg_temp.check(
    (select c.name || '|' || p.name || '|' || c.emoji from public.transactions t
      join public.categories c on c.id = t.category_id
      join public.categories p on p.id = c.parent_id
      where t.dedupe_key = 'rb:t2') = 'Snacks|Food|🍟',
    'transaksi memakai subkategori yang benar');
  perform pg_temp.check(
    (select is_adjustment and category_id is null from public.transactions where dedupe_key = 'rb:t4'),
    'koreksi saldo tanpa kategori');
  perform pg_temp.check(
    (select to_account_id is not null from public.transactions where dedupe_key = 'rb:t3'),
    'transfer punya akun tujuan');
  perform pg_temp.check(
    (select count(*) from public.import_existing_keys(v_book, array['rb:t1', 'rb:t9'])) = 1,
    'import_existing_keys hanya mengembalikan kunci yang ada');
  perform pg_temp.check(
    (select balance from public.account_balances b join public.accounts a on a.id = b.account_id
      where a.book_id = v_book and a.name = 'Bank Uji') = 900000,
    'saldo Bank Uji = 1.000.000 - 100.000');

  -- Impor ulang: tidak ada yang bertambah, tidak ada batch kosong
  v_second := public.commit_import(v_book, v_payload);
  perform pg_temp.check((v_second ->> 'inserted')::int = 0, 'impor kedua menambah 0');
  perform pg_temp.check((v_second ->> 'duplicates')::int = 4, 'impor kedua: 4 duplikat');
  perform pg_temp.check(v_second ->> 'batchId' is null, 'impor kedua tidak membuat batch');
  perform pg_temp.check((v_second ->> 'categoriesCreated')::int = 0, 'impor kedua: 0 kategori baru');
  perform pg_temp.check(
    (select count(*) from public.import_batches where book_id = v_book) = 1, 'satu batch di riwayat');

  -- Batalkan impor: transaksi hilang, saldo kembali
  perform pg_temp.check(
    public.revert_import((v_first ->> 'batchId')::uuid) = 4, 'batalkan menghapus 4 transaksi');
  perform pg_temp.check(
    (select count(*) from public.transactions where book_id = v_book) = 0, 'tidak ada transaksi tersisa');
  perform pg_temp.check(
    (select status from public.import_batches where id = (v_first ->> 'batchId')::uuid) = 'reverted',
    'status batch reverted');
  perform pg_temp.check(
    (select balance from public.account_balances b join public.accounts a on a.id = b.account_id
      where a.book_id = v_book and a.name = 'Bank Uji') = 0,
    'saldo kembali seperti sebelum impor');
  perform pg_temp.check(
    public.revert_import((v_first ->> 'batchId')::uuid) = 0, 'batalkan dua kali aman');

  -- Setelah dibatalkan, impor lagi masuk kembali
  perform pg_temp.check(
    (public.commit_import(v_book, v_payload) ->> 'inserted')::int = 4, 'impor ulang setelah batal');
end;
$$;

select 'SEMUA TEST LOLOS' as hasil;
rollback;
