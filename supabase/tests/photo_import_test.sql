-- ============================================================
-- Test fase 11 T1: kuota AI harian dan commit hasil foto. ROLLBACK.
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
  v_b uuid := gen_random_uuid();
  v_book uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (v_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@test.local', '{"display_name":"Ana"}'),
    (v_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'budi@test.local', '{"display_name":"Budi"}');
  select id into v_book from public.books where created_by = v_a;
  perform set_config('test.a', v_a::text, false);
  perform set_config('test.b', v_b::text, false);
  perform set_config('test.book', v_book::text, false);
  perform set_config('test.acc', (select id::text from public.accounts where book_id = v_book limit 1), false);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.a'), 'role', 'authenticated')::text, true);

-- ---------- kuota: 2 per hari ----------
select pg_temp.check(public.ai_take_quota(2) = 1, 'jatah pertama, sisa 1');
select pg_temp.check(public.ai_take_quota(2) = 0, 'jatah kedua, sisa 0');
select pg_temp.check(public.ai_take_quota(2) = -1, 'jatah ketiga ditolak');
select public.ai_refund_quota();
select pg_temp.check(public.ai_take_quota(2) = 0, 'jatah yang dikembalikan bisa dipakai lagi');

-- User lain punya kuota sendiri dan tidak melihat baris Ana
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.b'), 'role', 'authenticated')::text, true);
select pg_temp.check(public.ai_take_quota(2) = 1, 'kuota per user');
select pg_temp.check((select count(*) from public.ai_usage) = 1, 'hanya baris sendiri yang terlihat');

-- ---------- commit hasil foto ----------
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.a'), 'role', 'authenticated')::text, true);
select pg_temp.check(
  (public.commit_bank_import(current_setting('test.book')::uuid, jsonb_build_object(
    'kind', 'photo', 'filename', 'struk.jpg', 'transactions', jsonb_build_array(
      jsonb_build_object('occurred_at', '2026-10-20T12:00:00+07:00', 'type', 'expense', 'amount', 25000,
        'account_id', current_setting('test.acc'), 'note', 'Kopi', 'dedupe_key', 'ph:satu'),
      -- Kunci mutasi bank tidak diterima di impor foto
      jsonb_build_object('occurred_at', '2026-10-20T12:00:00+07:00', 'type', 'expense', 'amount', 1,
        'account_id', current_setting('test.acc'), 'dedupe_key', 'bk:lain')
    ))) ->> 'inserted')::int = 1,
  'satu baris foto tersimpan');
select pg_temp.check(
  (select t.source = 'ocr' and b.source = 'photo' from public.transactions t
   join public.import_batches b on b.id = t.import_batch_id where t.dedupe_key = 'ph:satu'),
  'batch photo dengan transaksi ocr');

select 'SEMUA TEST LOLOS' as hasil;
rollback;
