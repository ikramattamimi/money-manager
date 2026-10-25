-- Fase 10 T5: angka mentah untuk kartu Ringkasan di Statistik. Kalimat
-- disusun di client. Nominal bersih (setelah kaitan reimburse/utang), tanpa
-- transfer dan koreksi saldo. [p_from, p_to) = periode terpilih,
-- [p_prev_from, p_prev_to) = periode sebelumnya dengan panjang yang sama.

create function public.period_insight(
  p_book_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz
)
returns table (
  income bigint,
  expense bigint,
  prev_income bigint,
  prev_expense bigint,
  -- Kategori induk dengan kenaikan pengeluaran terbesar dibanding periode sebelumnya
  rise_category_id uuid,
  rise_now bigint,
  rise_prev bigint,
  -- Hari (WIB) dengan pengeluaran terbesar di periode terpilih
  peak_day date,
  peak_expense bigint,
  -- Jumlah hari yang ada pengeluarannya
  expense_days integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with tx as (
    select
      t.type,
      (t.occurred_at at time zone 'Asia/Jakarta')::date as day,
      t.amount - coalesce(o.linked, 0) as net,
      coalesce(c.parent_id, c.id) as root,
      t.occurred_at >= p_from and t.occurred_at < p_to as cur
    from public.transactions t
    left join private.offsets_by_tx(p_book_id) o on o.id = t.id
    left join public.categories c on c.id = t.category_id
    where t.book_id = p_book_id
      and t.type <> 'transfer'
      and not t.is_adjustment
      and (
        (t.occurred_at >= p_from and t.occurred_at < p_to)
        or (t.occurred_at >= p_prev_from and t.occurred_at < p_prev_to)
      )
  ),
  totals as (
    select
      coalesce(sum(net) filter (where cur and type = 'income'), 0)::bigint as income,
      coalesce(sum(net) filter (where cur and type = 'expense'), 0)::bigint as expense,
      coalesce(sum(net) filter (where not cur and type = 'income'), 0)::bigint as prev_income,
      coalesce(sum(net) filter (where not cur and type = 'expense'), 0)::bigint as prev_expense,
      (count(distinct day) filter (where cur and type = 'expense' and net > 0))::integer as expense_days
    from tx
  ),
  rise as (
    select
      root,
      coalesce(sum(net) filter (where cur), 0)::bigint as now_total,
      coalesce(sum(net) filter (where not cur), 0)::bigint as prev_total
    from tx
    where type = 'expense' and root is not null
    group by root
    order by coalesce(sum(net) filter (where cur), 0) - coalesce(sum(net) filter (where not cur), 0) desc
    limit 1
  ),
  peak as (
    select day, sum(net)::bigint as total
    from tx
    where cur and type = 'expense'
    group by day
    having sum(net) > 0
    order by 2 desc, 1 desc
    limit 1
  )
  select
    totals.income, totals.expense, totals.prev_income, totals.prev_expense,
    rise.root, rise.now_total, rise.prev_total,
    peak.day, peak.total,
    totals.expense_days
  from totals
  left join rise on true
  left join peak on true;
$$;

revoke all on function public.period_insight(uuid, timestamptz, timestamptz, timestamptz, timestamptz) from public, anon;
grant execute on function public.period_insight(uuid, timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;
