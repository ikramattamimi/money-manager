-- Fase 10 T1: tanggal awal bulan per buku. "Bulan" sebuah buku dimulai di
-- tanggal month_start_day (1–31) jam 00.00 WIB. Bulan yang lebih pendek dari
-- tanggal itu mulai di hari terakhirnya. Periode dinamai menurut bulan tempat
-- ia dimulai: awal 25 → periode Oktober = 25 Okt – 24 Nov.
--
-- Periode diwakili tanggal pertama bulan namanya (kunci periode, mis.
-- 2026-10-01). Aturan yang sama ada di app/lib/time.ts (periodRange/periodOf).

alter table public.books
  add column month_start_day smallint not null default 1
  check (month_start_day between 1 and 31);

-- Awal periode p_month (tanggal 1 bulan namanya) sebagai timestamptz WIB
create function private.period_start(p_month date, p_day integer)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select make_timestamptz(
    extract(year from p_month)::integer,
    extract(month from p_month)::integer,
    least(
      greatest(p_day, 1),
      extract(day from (date_trunc('month', p_month) + interval '1 month - 1 day'))::integer
    ),
    0, 0, 0, 'Asia/Jakarta'
  );
$$;

-- Kunci periode (tanggal 1 bulan namanya) tempat sebuah waktu jatuh
create function private.period_key(p_at timestamptz, p_day integer)
returns date
language sql
stable
set search_path = ''
as $$
  select case
    when p_at >= private.period_start(date_trunc('month', p_at at time zone 'Asia/Jakarta')::date, p_day)
      then date_trunc('month', p_at at time zone 'Asia/Jakarta')::date
    else (date_trunc('month', p_at at time zone 'Asia/Jakarta') - interval '1 month')::date
  end;
$$;

-- Tanggal awal bulan buku (1 kalau buku tidak terlihat)
create function private.book_start_day(p_book_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce((select b.month_start_day from public.books b where b.id = p_book_id), 1)::integer;
$$;

revoke all on function private.period_start(date, integer) from public, anon;
revoke all on function private.period_key(timestamptz, integer) from public, anon;
revoke all on function private.book_start_day(uuid) from public, anon;
grant execute on function private.period_start(date, integer) to authenticated;
grant execute on function private.period_key(timestamptz, integer) to authenticated;
grant execute on function private.book_start_day(uuid) to authenticated;

-- ------------------------------------------------------------
-- Ringkasan per periode bulan dalam satu tahun (tab Bulanan)
-- ------------------------------------------------------------
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
    coalesce(sum(t.amount) filter (where t.type = 'income' and not t.is_adjustment), 0)::bigint,
    coalesce(sum(t.amount) filter (where t.type = 'expense' and not t.is_adjustment), 0)::bigint,
    count(*)::integer
  from public.transactions t, s
  where t.book_id = p_book_id
    and t.occurred_at >= private.period_start(make_date(p_year, 1, 1), s.day)
    and t.occurred_at < private.period_start(make_date(p_year + 1, 1, 1), s.day)
  group by 1
  order by 1;
$$;

-- ------------------------------------------------------------
-- Tren pemasukan/pengeluaran per periode bulan
-- ------------------------------------------------------------
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
    select private.period_key(t.occurred_at, s.day) as m, t.type, t.amount
    from public.transactions t, s
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

-- ------------------------------------------------------------
-- Budget per periode bulan (aturan berlaku sama seperti fase 7)
-- ------------------------------------------------------------
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
      t.amount
    from public.transactions t
    left join public.categories c on c.id = t.category_id
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
