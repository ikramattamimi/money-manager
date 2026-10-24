-- Fase 5: impor Realbyte. Semua SECURITY INVOKER, jadi RLS tetap berlaku.

-- Kunci anti-dobel yang sudah ada di buku, untuk menghitung duplikat di preview
create function public.import_existing_keys(p_book_id uuid, p_keys text[])
returns setof text
language sql
stable
security invoker
set search_path = public
as $$
  select t.dedupe_key
  from public.transactions t
  where t.book_id = p_book_id and t.dedupe_key = any (p_keys);
$$;

-- Simpan satu impor dalam satu transaksi database: batch, grup akun yang
-- belum ada, akun dan kategori baru (dicocokkan dengan nama, tidak peka huruf
-- besar/kecil), lalu semua transaksi. Duplikat dilewati lewat dedupe_key.
--
-- p_payload = {
--   filename, row_count,
--   accounts:     [{ name, kind }],
--   categories:   [{ key, kind, name, emoji, icon, tone, parent_key }],
--   transactions: [{ occurred_at, type, amount, account, to_account, category,
--                    note, description, is_adjustment, dedupe_key }]
-- }
create function public.commit_import(p_book_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch uuid;
  v_total integer;
  v_inserted integer;
  v_accounts integer;
  v_parents integer;
  v_children integer;
begin
  if not private.can_edit_book(p_book_id) then
    raise exception 'Kamu tidak punya akses mengubah buku ini' using errcode = '42501';
  end if;

  v_total := jsonb_array_length(coalesce(p_payload -> 'transactions', '[]'));

  insert into public.import_batches (book_id, source, filename, row_count)
  values (p_book_id, 'realbyte_xlsx', left(coalesce(p_payload ->> 'filename', ''), 200), 0)
  returning id into v_batch;

  -- ---------- grup akun ----------
  insert into public.account_groups (book_id, name, kind, sort)
  select
    p_book_id,
    case k.kind
      when 'cash' then 'Tunai' when 'bank' then 'Bank' when 'ewallet' then 'E-Wallet'
      when 'card' then 'Kartu Kredit' when 'savings' then 'Tabungan'
      when 'investment' then 'Investasi' when 'receivable' then 'Piutang'
      when 'loan' then 'Utang' else 'Lainnya'
    end,
    k.kind,
    (select coalesce(max(sort), -1) + 1 from public.account_groups where book_id = p_book_id)
      + row_number() over (order by k.kind) - 1
  from (
    select distinct x.kind
    from jsonb_to_recordset(p_payload -> 'accounts') as x(name text, kind public.account_kind)
  ) k
  where not exists (
    select 1 from public.account_groups g where g.book_id = p_book_id and g.kind = k.kind
  );

  -- ---------- akun ----------
  create temp table _import_accounts (lname text primary key, id uuid not null) on commit drop;

  insert into public.accounts (book_id, group_id, name, sort)
  select
    p_book_id,
    (select g.id from public.account_groups g
      where g.book_id = p_book_id and g.kind = x.kind order by g.sort limit 1),
    left(trim(x.name), 60),
    (select coalesce(max(sort), -1) + 1 from public.accounts where book_id = p_book_id)
      + row_number() over (order by x.ord) - 1
  from (
    select e.v ->> 'name' as name, (e.v ->> 'kind')::public.account_kind as kind, e.ord
    from jsonb_array_elements(p_payload -> 'accounts') with ordinality as e(v, ord)
  ) x
  where trim(coalesce(x.name, '')) <> ''
    and not exists (
      select 1 from public.accounts a
      where a.book_id = p_book_id and lower(a.name) = lower(left(trim(x.name), 60))
    );
  get diagnostics v_accounts = row_count;

  -- Nama sama dipakai sekali: akun aktif dulu, lalu yang paling lama
  insert into _import_accounts (lname, id)
  select distinct on (lower(a.name)) lower(a.name), a.id
  from public.accounts a
  where a.book_id = p_book_id
  order by lower(a.name), a.archived, a.created_at;

  -- ---------- kategori ----------
  create temp table _import_categories (key text primary key, id uuid not null) on commit drop;
  create temp table _import_category_rows on commit drop as
  select
    e.v ->> 'key' as key,
    (e.v ->> 'kind')::public.category_kind as kind,
    e.v ->> 'name' as name,
    e.v ->> 'emoji' as emoji,
    e.v ->> 'icon' as icon,
    e.v ->> 'tone' as tone,
    e.v ->> 'parent_key' as parent_key,
    e.ord
  from jsonb_array_elements(coalesce(p_payload -> 'categories', '[]')) with ordinality as e(v, ord);

  insert into public.categories (book_id, kind, name, emoji, icon, tone, sort)
  select
    p_book_id, x.kind, left(trim(x.name), 60), coalesce(x.emoji, ''),
    coalesce(nullif(x.icon, ''), 'tag'), coalesce(nullif(x.tone, ''), 'neutral'),
    (select coalesce(max(sort), -1) + 1 from public.categories
      where book_id = p_book_id and parent_id is null and kind = x.kind)
      + row_number() over (partition by x.kind order by x.ord) - 1
  from _import_category_rows x
  where x.parent_key is null
    and not exists (
      select 1 from public.categories c
      where c.book_id = p_book_id and c.kind = x.kind and c.parent_id is null
        and lower(c.name) = lower(left(trim(x.name), 60))
    );
  get diagnostics v_parents = row_count;

  insert into _import_categories (key, id)
  select distinct on (x.key) x.key, c.id
  from _import_category_rows x
  join public.categories c
    on c.book_id = p_book_id and c.kind = x.kind and c.parent_id is null
   and lower(c.name) = lower(left(trim(x.name), 60))
  where x.parent_key is null
  order by x.key, c.archived, c.created_at;

  insert into public.categories (book_id, kind, parent_id, name, emoji, icon, tone, sort)
  select
    p_book_id, x.kind, p.id, left(trim(x.name), 60), coalesce(x.emoji, ''),
    coalesce(nullif(x.icon, ''), 'tag'), coalesce(nullif(x.tone, ''), 'neutral'),
    row_number() over (partition by p.id order by x.ord) - 1
      + (select count(*) from public.categories s where s.parent_id = p.id)
  from _import_category_rows x
  join _import_categories p on p.key = x.parent_key
  where not exists (
    select 1 from public.categories c
    where c.parent_id = p.id and lower(c.name) = lower(left(trim(x.name), 60))
  );
  get diagnostics v_children = row_count;

  insert into _import_categories (key, id)
  select distinct on (x.key) x.key, c.id
  from _import_category_rows x
  join _import_categories p on p.key = x.parent_key
  join public.categories c
    on c.parent_id = p.id and lower(c.name) = lower(left(trim(x.name), 60))
  order by x.key, c.archived, c.created_at
  on conflict (key) do nothing;

  -- ---------- transaksi ----------
  insert into public.transactions (
    book_id, type, occurred_at, amount, account_id, to_account_id, category_id,
    is_adjustment, note, description, source, import_batch_id, dedupe_key
  )
  select
    p_book_id, x.type, x.occurred_at, x.amount, a.id,
    case when x.type = 'transfer' then b.id end,
    case when x.type <> 'transfer' and not coalesce(x.is_adjustment, false) then c.id end,
    coalesce(x.is_adjustment, false), coalesce(x.note, ''), coalesce(x.description, ''),
    'import_realbyte', v_batch, x.dedupe_key
  from jsonb_to_recordset(p_payload -> 'transactions')
    as x(occurred_at timestamptz, type public.transaction_type, amount bigint, account text,
         to_account text, category text, note text, description text, is_adjustment boolean,
         dedupe_key text)
  join _import_accounts a on a.lname = lower(left(trim(x.account), 60))
  left join _import_accounts b on b.lname = lower(left(trim(x.to_account), 60))
  left join _import_categories c on c.key = x.category
  on conflict (book_id, dedupe_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    -- Semua duplikat: tidak perlu meninggalkan batch kosong di riwayat
    delete from public.import_batches where id = v_batch;
    v_batch := null;
  else
    update public.import_batches set row_count = v_inserted where id = v_batch;
  end if;

  return jsonb_build_object(
    'batchId', v_batch,
    'inserted', v_inserted,
    'duplicates', v_total - v_inserted,
    'accountsCreated', v_accounts,
    'categoriesCreated', v_parents + v_children
  );
end;
$$;

-- Batalkan impor: hapus semua transaksinya. Akun dan kategori yang dibuat
-- impor tetap ada (mungkin sudah dipakai transaksi lain).
create function public.revert_import(p_batch_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch public.import_batches;
  v_deleted integer;
begin
  select * into v_batch from public.import_batches where id = p_batch_id;
  if not found then
    raise exception 'Impor tidak ditemukan' using errcode = 'P0002';
  end if;
  if not private.can_edit_book(v_batch.book_id) then
    raise exception 'Kamu tidak punya akses mengubah buku ini' using errcode = '42501';
  end if;
  if v_batch.status = 'reverted' then
    return 0;
  end if;

  delete from public.transactions where import_batch_id = p_batch_id;
  get diagnostics v_deleted = row_count;
  update public.import_batches set status = 'reverted' where id = p_batch_id;
  return v_deleted;
end;
$$;

revoke all on function public.import_existing_keys(uuid, text[]) from public, anon;
revoke all on function public.commit_import(uuid, jsonb) from public, anon;
revoke all on function public.revert_import(uuid) from public, anon;
grant execute on function public.import_existing_keys(uuid, text[]) to authenticated;
grant execute on function public.commit_import(uuid, jsonb) to authenticated;
grant execute on function public.revert_import(uuid) to authenticated;
