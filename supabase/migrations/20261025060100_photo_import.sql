-- Fase 11 T1: baca foto struk/screenshot lewat Claude API.
-- * Sumber impor baru 'photo' (transaksi tetap ber-source 'ocr').
-- * Kuota harian per user supaya biaya AI tidak lepas kendali.
-- * commit_bank_import menerima payload.kind = 'photo' (batch 'photo',
--   transaksi 'ocr', dedupe_key 'ph:'); selain itu tetap mutasi bank.

alter type public.import_source add value if not exists 'photo';

-- Pemakaian AI per user per hari (WIB). Hanya baris milik sendiri.
create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage: milik sendiri" on public.ai_usage
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ambil satu jatah hari ini. Mengembalikan sisa jatah setelah diambil, atau -1
-- kalau jatah hari ini sudah habis (tidak ada yang berubah).
create function public.ai_take_quota(p_limit integer)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Belum masuk' using errcode = '42501';
  end if;
  insert into public.ai_usage (user_id, day, count)
  values (auth.uid(), v_day, 0)
  on conflict (user_id, day) do nothing;

  update public.ai_usage
  set count = count + 1
  where user_id = auth.uid() and day = v_day and count < greatest(p_limit, 0)
  returning count into v_count;

  return case when v_count is null then -1 else greatest(p_limit, 0) - v_count end;
end;
$$;

-- Kembalikan jatah kalau panggilan AI gagal sebelum menghasilkan apa pun
create function public.ai_refund_quota()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.ai_usage
  set count = greatest(count - 1, 0)
  where user_id = auth.uid() and day = (now() at time zone 'Asia/Jakarta')::date;
$$;

revoke all on function public.ai_take_quota(integer) from public, anon;
revoke all on function public.ai_refund_quota() from public, anon;
grant execute on function public.ai_take_quota(integer) to authenticated;
grant execute on function public.ai_refund_quota() to authenticated;

-- ------------------------------------------------------------
-- Simpan hasil pencocokan (mutasi bank atau foto)
-- ------------------------------------------------------------
create or replace function public.commit_bank_import(p_book_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch uuid;
  v_total integer;
  v_inserted integer;
  v_photo boolean := coalesce(p_payload ->> 'kind', '') = 'photo';
  v_prefix text := case when coalesce(p_payload ->> 'kind', '') = 'photo' then 'ph:%' else 'bk:%' end;
begin
  if not private.can_edit_book(p_book_id) then
    raise exception 'Kamu tidak punya akses mengubah buku ini' using errcode = '42501';
  end if;

  v_total := jsonb_array_length(coalesce(p_payload -> 'transactions', '[]'));
  if v_total = 0 then
    return jsonb_build_object('batchId', null, 'inserted', 0, 'duplicates', 0);
  end if;

  insert into public.import_batches (book_id, source, filename, row_count)
  values (
    p_book_id,
    (case when v_photo then 'photo' else 'bank_statement' end)::public.import_source,
    left(coalesce(p_payload ->> 'filename', ''), 200),
    0
  )
  returning id into v_batch;

  insert into public.transactions (
    book_id, type, occurred_at, amount, account_id, to_account_id, category_id,
    note, description, source, import_batch_id, dedupe_key
  )
  select
    p_book_id, x.type, x.occurred_at, x.amount, x.account_id,
    case when x.type = 'transfer' then x.to_account_id end,
    case when x.type <> 'transfer' then x.category_id end,
    left(coalesce(x.note, ''), 200), left(coalesce(x.description, ''), 500),
    (case when v_photo then 'ocr' else 'import_bank' end)::public.transaction_source,
    v_batch, x.dedupe_key
  from jsonb_to_recordset(p_payload -> 'transactions')
    as x(occurred_at timestamptz, type public.transaction_type, amount bigint, account_id uuid,
         to_account_id uuid, category_id uuid, note text, description text, dedupe_key text)
  where x.dedupe_key like v_prefix
  on conflict (book_id, dedupe_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    delete from public.import_batches where id = v_batch;
    v_batch := null;
  else
    update public.import_batches set row_count = v_inserted where id = v_batch;
  end if;

  return jsonb_build_object('batchId', v_batch, 'inserted', v_inserted, 'duplicates', v_total - v_inserted);
end;
$$;
