-- Simpan hasil pencocokan mutasi bank: satu batch impor (sumber
-- bank_statement), transaksi ber-source import_bank. Baris yang dedupe_key-nya
-- sudah ada di buku dilewati. Semua atau tidak sama sekali.
--
-- p_payload = { filename, transactions: [{ occurred_at, type, amount,
--   account_id, to_account_id, category_id, note, description, dedupe_key }] }

create function public.commit_bank_import(p_book_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch uuid;
  v_total integer;
  v_inserted integer;
begin
  if not private.can_edit_book(p_book_id) then
    raise exception 'Kamu tidak punya akses mengubah buku ini' using errcode = '42501';
  end if;

  v_total := jsonb_array_length(coalesce(p_payload -> 'transactions', '[]'));
  if v_total = 0 then
    return jsonb_build_object('batchId', null, 'inserted', 0, 'duplicates', 0);
  end if;

  insert into public.import_batches (book_id, source, filename, row_count)
  values (p_book_id, 'bank_statement', left(coalesce(p_payload ->> 'filename', ''), 200), 0)
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
    'import_bank', v_batch, x.dedupe_key
  from jsonb_to_recordset(p_payload -> 'transactions')
    as x(occurred_at timestamptz, type public.transaction_type, amount bigint, account_id uuid,
         to_account_id uuid, category_id uuid, note text, description text, dedupe_key text)
  where x.dedupe_key like 'bk:%'
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

revoke all on function public.commit_bank_import(uuid, jsonb) from public, anon;
grant execute on function public.commit_bank_import(uuid, jsonb) to authenticated;
