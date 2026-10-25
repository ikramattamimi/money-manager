-- Fase 10 T6: kaitkan pemasukan ke pengeluaran yang digantinya (reimburse,
-- utang yang dibayar). Bagian yang dikaitkan tidak dihitung sebagai
-- pengeluaran maupun pemasukan di statistik; saldo akun tidak berubah.
--
-- Satu kaitan = (pengeluaran, pemasukan, nominal). Boleh sebagian, dicicil
-- (beberapa pemasukan ke satu pengeluaran), atau satu pemasukan untuk beberapa
-- pengeluaran. Total kaitan tidak boleh melebihi nominal salah satu sisi.
-- Pengurangan berlaku di periode pengeluarannya.

create table public.transaction_offsets (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  expense_id uuid not null,
  income_id uuid not null,
  amount bigint not null check (amount > 0),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint transaction_offsets_expense_id_fkey
    foreign key (expense_id) references public.transactions (id) on delete cascade,
  constraint transaction_offsets_income_id_fkey
    foreign key (income_id) references public.transactions (id) on delete cascade,
  unique (expense_id, income_id)
);
create index transaction_offsets_book_id_idx on public.transaction_offsets (book_id);
create index transaction_offsets_income_id_idx on public.transaction_offsets (income_id);
create index transaction_offsets_created_by_idx on public.transaction_offsets (created_by);

alter table public.transaction_offsets enable row level security;
create policy "transaction_offsets: anggota bisa membaca" on public.transaction_offsets
  for select to authenticated using (private.is_book_member(book_id));
create policy "transaction_offsets: owner/editor bisa menambah" on public.transaction_offsets
  for insert to authenticated with check (private.can_edit_book(book_id));
create policy "transaction_offsets: owner/editor bisa mengubah" on public.transaction_offsets
  for update to authenticated
  using (private.can_edit_book(book_id)) with check (private.can_edit_book(book_id));
create policy "transaction_offsets: owner/editor bisa menghapus" on public.transaction_offsets
  for delete to authenticated using (private.can_edit_book(book_id));

-- ------------------------------------------------------------
-- Penjaga: jenis dan buku cocok, total kaitan tidak melebihi nominal
-- ------------------------------------------------------------
create function private.check_transaction_offset()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_expense public.transactions;
  v_income public.transactions;
  v_expense_linked bigint;
  v_income_linked bigint;
begin
  -- Kunci kedua transaksi supaya dua kaitan bersamaan tidak lolos batas
  select * into v_expense from public.transactions where id = new.expense_id for update;
  select * into v_income from public.transactions where id = new.income_id for update;

  if v_expense.id is null or v_expense.type <> 'expense' or v_expense.is_adjustment then
    raise exception 'Kaitan harus ke pengeluaran biasa' using errcode = '23514';
  end if;
  if v_income.id is null or v_income.type <> 'income' or v_income.is_adjustment then
    raise exception 'Pengganti harus pemasukan biasa' using errcode = '23514';
  end if;
  if v_expense.book_id <> new.book_id or v_income.book_id <> new.book_id then
    raise exception 'Transaksi yang dikaitkan harus di buku yang sama' using errcode = '23514';
  end if;

  select coalesce(sum(o.amount), 0) into v_expense_linked
  from public.transaction_offsets o where o.expense_id = new.expense_id and o.id <> new.id;
  select coalesce(sum(o.amount), 0) into v_income_linked
  from public.transaction_offsets o where o.income_id = new.income_id and o.id <> new.id;

  if v_expense_linked + new.amount > v_expense.amount then
    raise exception 'Total kaitan melebihi pengeluaran (sisa Rp%)',
      replace(to_char(v_expense.amount - v_expense_linked, 'FM999,999,999,999'), ',', '.') using errcode = '23514';
  end if;
  if v_income_linked + new.amount > v_income.amount then
    raise exception 'Total kaitan melebihi pemasukan (sisa Rp%)',
      replace(to_char(v_income.amount - v_income_linked, 'FM999,999,999,999'), ',', '.') using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger transaction_offsets_check
  before insert or update on public.transaction_offsets
  for each row execute function private.check_transaction_offset();

-- Transaksi yang sudah dikaitkan tidak boleh berubah jenis atau turun di bawah total kaitannya
create function private.check_offset_on_transaction()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_linked bigint;
begin
  select coalesce(sum(o.amount), 0) into v_linked
  from public.transaction_offsets o
  where o.expense_id = new.id or o.income_id = new.id;
  if v_linked = 0 then
    return new;
  end if;
  if new.type <> old.type or new.is_adjustment then
    raise exception 'Lepas kaitannya dulu sebelum mengubah jenis transaksi' using errcode = '23514';
  end if;
  if new.amount < v_linked then
    raise exception 'Nominal tidak boleh kurang dari total yang sudah dikaitkan (Rp%)',
      replace(to_char(v_linked, 'FM999,999,999,999'), ',', '.') using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger transactions_check_offset
  before update of type, amount, is_adjustment on public.transactions
  for each row execute function private.check_offset_on_transaction();

-- Total kaitan per transaksi satu buku (pengeluaran dan pemasukan sekaligus)
create function private.offsets_by_tx(p_book_id uuid)
returns table (id uuid, linked bigint)
language sql
stable
set search_path = ''
as $$
  select o.expense_id, sum(o.amount)::bigint
  from public.transaction_offsets o where o.book_id = p_book_id group by o.expense_id
  union all
  select o.income_id, sum(o.amount)::bigint
  from public.transaction_offsets o where o.book_id = p_book_id group by o.income_id;
$$;

revoke all on function private.check_transaction_offset() from public, anon, authenticated;
revoke all on function private.check_offset_on_transaction() from public, anon, authenticated;
revoke all on function private.offsets_by_tx(uuid) from public, anon;
grant execute on function private.offsets_by_tx(uuid) to authenticated;

-- ------------------------------------------------------------
-- Ganti semua kaitan sebuah pemasukan sekaligus.
-- p_links = [{ expense_id, amount }]; [] melepas semua.
-- ------------------------------------------------------------
create function public.set_income_offsets(p_income_id uuid, p_links jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_book uuid;
  v_count integer;
begin
  select book_id into v_book from public.transactions where id = p_income_id;
  if v_book is null then
    raise exception 'Transaksi tidak ditemukan' using errcode = 'P0002';
  end if;
  if not private.can_edit_book(v_book) then
    raise exception 'Kamu tidak punya akses mengubah buku ini' using errcode = '42501';
  end if;

  delete from public.transaction_offsets where income_id = p_income_id;
  insert into public.transaction_offsets (book_id, expense_id, income_id, amount)
  select v_book, x.expense_id, p_income_id, x.amount
  from jsonb_to_recordset(coalesce(p_links, '[]')) as x(expense_id uuid, amount bigint)
  where x.amount > 0;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- Pengeluaran yang masih bisa diganti, terbaru dulu. Sisa dihitung tanpa
-- kaitan milik p_income_id (yang sedang diedit) supaya bisa diubah ulang.
-- ------------------------------------------------------------
create function public.offset_candidates(
  p_book_id uuid,
  p_income_id uuid default null,
  p_query text default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  occurred_at timestamptz,
  note text,
  category_id uuid,
  account_id uuid,
  amount bigint,
  remaining bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (select nullif(trim(coalesce(p_query, '')), '') as text)
  select
    t.id, t.occurred_at, t.note, t.category_id, t.account_id, t.amount,
    (t.amount - coalesce((
      select sum(o.amount) from public.transaction_offsets o
      where o.expense_id = t.id and o.income_id is distinct from p_income_id
    ), 0))::bigint as remaining
  from public.transactions t, q
  where t.book_id = p_book_id
    and t.type = 'expense'
    and not t.is_adjustment
    and (q.text is null or t.note ilike '%' || q.text || '%' or t.description ilike '%' || q.text || '%')
    and t.amount > coalesce((
      select sum(o.amount) from public.transaction_offsets o
      where o.expense_id = t.id and o.income_id is distinct from p_income_id
    ), 0)
  order by t.occurred_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

revoke all on function public.set_income_offsets(uuid, jsonb) from public, anon;
revoke all on function public.offset_candidates(uuid, uuid, text, integer) from public, anon;
grant execute on function public.set_income_offsets(uuid, jsonb) to authenticated;
grant execute on function public.offset_candidates(uuid, uuid, text, integer) to authenticated;

-- ============================================================
-- RPC statistik memakai nominal bersih (nominal − total kaitan)
-- ============================================================

create or replace function public.category_breakdown(
  p_book_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_type public.transaction_type
)
returns table (root_id uuid, category_id uuid, total bigint, tx_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(c.parent_id, c.id) as root_id,
    t.category_id,
    sum(t.amount - coalesce(o.linked, 0))::bigint as total,
    (count(*) filter (where t.amount > coalesce(o.linked, 0)))::integer as tx_count
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  left join private.offsets_by_tx(p_book_id) o on o.id = t.id
  where t.book_id = p_book_id
    and t.type = p_type
    and p_type <> 'transfer'
    and not t.is_adjustment
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by 1, 2
  having sum(t.amount - coalesce(o.linked, 0)) > 0
  order by 3 desc;
$$;

create or replace function public.months_overview(p_book_id uuid, p_year integer)
returns table (month integer, income bigint, expense bigint, tx_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (select private.book_start_day(p_book_id) as day)
  select
    extract(month from private.period_key(t.occurred_at, s.day))::integer as month,
    coalesce(sum(t.amount - coalesce(o.linked, 0)) filter (where t.type = 'income' and not t.is_adjustment), 0)::bigint,
    coalesce(sum(t.amount - coalesce(o.linked, 0)) filter (where t.type = 'expense' and not t.is_adjustment), 0)::bigint,
    count(*)::integer
  from public.transactions t
  cross join s
  left join private.offsets_by_tx(p_book_id) o on o.id = t.id
  where t.book_id = p_book_id
    and t.occurred_at >= private.period_start(make_date(p_year, 1, 1), s.day)
    and t.occurred_at < private.period_start(make_date(p_year + 1, 1, 1), s.day)
  group by 1
  order by 1;
$$;

create or replace function public.monthly_trend(
  p_book_id uuid,
  p_year integer,
  p_month integer,
  p_months integer default 6,
  p_category_id uuid default null
)
returns table (year integer, month integer, income bigint, expense bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (select private.book_start_day(p_book_id) as day),
  months as (
    select (make_date(p_year, p_month, 1) - make_interval(months => g))::date as m
    from generate_series(0, least(greatest(p_months, 1), 36) - 1) g
  ),
  cats as (
    select c.id from public.categories c
    where p_category_id is not null and (c.id = p_category_id or c.parent_id = p_category_id)
  ),
  tx as (
    select
      private.period_key(t.occurred_at, s.day) as m,
      t.type,
      t.amount - coalesce(o.linked, 0) as amount
    from public.transactions t
    cross join s
    left join private.offsets_by_tx(p_book_id) o on o.id = t.id
    where t.book_id = p_book_id
      and t.type <> 'transfer'
      and not t.is_adjustment
      and t.occurred_at >= private.period_start((select min(m) from months), s.day)
      and t.occurred_at < private.period_start((make_date(p_year, p_month, 1) + interval '1 month')::date, s.day)
      and (p_category_id is null or t.category_id in (select id from cats))
  )
  select
    extract(year from months.m)::integer,
    extract(month from months.m)::integer,
    coalesce(sum(tx.amount) filter (where tx.type = 'income'), 0)::bigint,
    coalesce(sum(tx.amount) filter (where tx.type = 'expense'), 0)::bigint
  from months
  left join tx on tx.m = months.m
  group by months.m
  order by months.m;
$$;

create or replace function public.budget_status(p_book_id uuid, p_year integer, p_month integer)
returns table (
  budget_id uuid,
  category_id uuid,
  amount bigint,
  carried bigint,
  spent bigint,
  carry_over boolean,
  start_on date
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      make_date(p_year, p_month, 1) as m,
      (make_date(p_year, p_month, 1) - interval '1 month')::date as prev,
      private.book_start_day(p_book_id) as day
  ),
  effective as (
    select distinct on (b.category_id) b.*
    from public.budgets b, bounds
    where b.book_id = p_book_id and b.start_on <= bounds.m
    order by b.category_id, b.start_on desc
  ),
  effective_prev as (
    select distinct on (b.category_id) b.*
    from public.budgets b, bounds
    where b.book_id = p_book_id and b.start_on <= bounds.prev
    order by b.category_id, b.start_on desc
  ),
  spending as (
    select
      private.period_key(t.occurred_at, bounds.day) as m,
      coalesce(c.parent_id, c.id) as root_id,
      t.category_id,
      t.amount - coalesce(o.linked, 0) as amount
    from public.transactions t
    left join public.categories c on c.id = t.category_id
    left join private.offsets_by_tx(p_book_id) o on o.id = t.id
    cross join bounds
    where t.book_id = p_book_id
      and t.type = 'expense'
      and not t.is_adjustment
      and t.occurred_at >= private.period_start(bounds.prev, bounds.day)
      and t.occurred_at < private.period_start((bounds.m + interval '1 month')::date, bounds.day)
  ),
  spent_by as (
    select
      e.id,
      coalesce(sum(s.amount) filter (where s.m = bounds.m), 0)::bigint as this_month,
      coalesce(sum(s.amount) filter (where s.m = bounds.prev), 0)::bigint as last_month
    from effective e
    cross join bounds
    left join spending s
      on e.category_id is null
      or s.category_id = e.category_id
      or s.root_id = e.category_id
    group by e.id
  )
  select
    e.id,
    e.category_id,
    e.amount,
    case
      when e.carry_over and p.id is not null
      then greatest(p.amount - sb.last_month, 0)
      else 0
    end::bigint,
    sb.this_month,
    e.carry_over,
    e.start_on
  from effective e
  join spent_by sb on sb.id = e.id
  left join effective_prev p on p.category_id is not distinct from e.category_id;
$$;
