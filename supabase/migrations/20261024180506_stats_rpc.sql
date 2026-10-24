-- Fase 7: statistik, budget, dan pencarian. Semua SECURITY INVOKER (RLS
-- berlaku). Koreksi saldo dan transfer tidak dihitung di statistik/budget.
-- Bulan dihitung di zona Asia/Jakarta.

-- ------------------------------------------------------------
-- Statistik per kategori: satu baris per kategori yang dipakai, dengan
-- induknya (root_id) supaya client bisa menggabung subkategori.
-- ------------------------------------------------------------
create function public.category_breakdown(
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
    sum(t.amount)::bigint as total,
    count(*)::integer as tx_count
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  where t.book_id = p_book_id
    and t.type = p_type
    and p_type <> 'transfer'
    and not t.is_adjustment
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by 1, 2
  order by 3 desc;
$$;

-- ------------------------------------------------------------
-- Tren pemasukan/pengeluaran per bulan: p_months bulan berakhir di
-- (p_year, p_month). p_category_id = kategori itu beserta subkategorinya.
-- Bulan tanpa transaksi tetap muncul dengan 0.
-- ------------------------------------------------------------
create function public.monthly_trend(
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
  with months as (
    select (make_date(p_year, p_month, 1) - make_interval(months => g))::date as m
    from generate_series(0, least(greatest(p_months, 1), 36) - 1) g
  ),
  cats as (
    select c.id from public.categories c
    where p_category_id is not null and (c.id = p_category_id or c.parent_id = p_category_id)
  ),
  tx as (
    select
      date_trunc('month', t.occurred_at at time zone 'Asia/Jakarta')::date as m,
      t.type,
      t.amount
    from public.transactions t
    where t.book_id = p_book_id
      and t.type <> 'transfer'
      and not t.is_adjustment
      and t.occurred_at >= (
        (select min(m) from months)::timestamp at time zone 'Asia/Jakarta'
      )
      and t.occurred_at < (
        (make_date(p_year, p_month, 1) + interval '1 month')::timestamp at time zone 'Asia/Jakarta'
      )
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
-- Budget bulan (p_year, p_month). Budget berlaku sejak start_on sampai ada
-- baris lebih baru untuk kategori yang sama. category_id null = budget total.
-- Budget kategori induk menghitung subkategorinya juga. carry_over: sisa bulan
-- lalu (kalau positif) ditambahkan ke bulan ini.
-- ------------------------------------------------------------
create function public.budget_status(p_book_id uuid, p_year integer, p_month integer)
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
      (make_date(p_year, p_month, 1) - interval '1 month')::date as prev
  ),
  -- Budget yang berlaku di sebuah bulan
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
      date_trunc('month', t.occurred_at at time zone 'Asia/Jakarta')::date as m,
      coalesce(c.parent_id, c.id) as root_id,
      t.category_id,
      t.amount
    from public.transactions t
    left join public.categories c on c.id = t.category_id
    cross join bounds
    where t.book_id = p_book_id
      and t.type = 'expense'
      and not t.is_adjustment
      and t.occurred_at >= bounds.prev::timestamp at time zone 'Asia/Jakarta'
      and t.occurred_at < (bounds.m + interval '1 month')::timestamp at time zone 'Asia/Jakarta'
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

-- ------------------------------------------------------------
-- Pencarian dan filter. Teks dicari di note dan description (ILIKE memakai
-- indeks trigram; juga cocok kalau salah ketik sedikit). Kategori induk
-- mencakup subkategorinya. Setiap baris membawa jumlah dan total semua hasil.
-- ------------------------------------------------------------
create function public.search_transactions(
  p_book_id uuid,
  p_query text default null,
  p_type public.transaction_type default null,
  p_account_id uuid default null,
  p_category_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_min bigint default null,
  p_max bigint default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  total_count integer,
  total_income bigint,
  total_expense bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select nullif(trim(coalesce(p_query, '')), '') as text
  ),
  hits as (
    select t.id, t.type, t.amount, t.occurred_at, t.created_at
    from public.transactions t, q
    where t.book_id = p_book_id
      and (q.text is null
        or t.note ilike '%' || q.text || '%'
        or t.description ilike '%' || q.text || '%'
        or (length(q.text) >= 4 and (q.text <% t.note or q.text <% t.description)))
      and (p_type is null or t.type = p_type)
      and (p_account_id is null or t.account_id = p_account_id or t.to_account_id = p_account_id)
      and (p_category_id is null or t.category_id in (
        select c.id from public.categories c where c.id = p_category_id or c.parent_id = p_category_id))
      and (p_from is null or t.occurred_at >= p_from)
      and (p_to is null or t.occurred_at < p_to)
      and (p_min is null or t.amount >= p_min)
      and (p_max is null or t.amount <= p_max)
  ),
  totals as (
    select
      count(*)::integer as n,
      coalesce(sum(amount) filter (where type = 'income'), 0)::bigint as income,
      coalesce(sum(amount) filter (where type = 'expense'), 0)::bigint as expense
    from hits
  )
  select h.id, totals.n, totals.income, totals.expense
  from hits h, totals
  order by h.occurred_at desc, h.created_at desc
  limit least(greatest(p_limit, 1), 500) offset greatest(p_offset, 0);
$$;

revoke all on function public.category_breakdown(uuid, timestamptz, timestamptz, public.transaction_type) from public, anon;
revoke all on function public.monthly_trend(uuid, integer, integer, integer, uuid) from public, anon;
revoke all on function public.budget_status(uuid, integer, integer) from public, anon;
revoke all on function public.search_transactions(uuid, text, public.transaction_type, uuid, uuid, timestamptz, timestamptz, bigint, bigint, integer, integer) from public, anon;
grant execute on function public.category_breakdown(uuid, timestamptz, timestamptz, public.transaction_type) to authenticated;
grant execute on function public.monthly_trend(uuid, integer, integer, integer, uuid) to authenticated;
grant execute on function public.budget_status(uuid, integer, integer) to authenticated;
grant execute on function public.search_transactions(uuid, text, public.transaction_type, uuid, uuid, timestamptz, timestamptz, bigint, bigint, integer, integer) to authenticated;
