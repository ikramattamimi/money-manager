-- Fase 10 T3: ringkasan per tahun untuk tampilan Tahunan di tab Transaksi.
-- Tahun mengikuti periode bulan buku (awal 25: tahun 2026 = periode Januari
-- s.d. Desember 2026 = 25 Jan 2026 – 24 Jan 2027) dan memakai nominal bersih
-- (setelah kaitan reimburse/utang), sama seperti months_overview.

create function public.years_overview(p_book_id uuid)
returns table (year integer, income bigint, expense bigint, tx_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (select private.book_start_day(p_book_id) as day)
  select
    extract(year from private.period_key(t.occurred_at, s.day))::integer as year,
    coalesce(sum(t.amount - coalesce(o.linked, 0)) filter (where t.type = 'income' and not t.is_adjustment), 0)::bigint,
    coalesce(sum(t.amount - coalesce(o.linked, 0)) filter (where t.type = 'expense' and not t.is_adjustment), 0)::bigint,
    count(*)::integer
  from public.transactions t
  cross join s
  left join private.offsets_by_tx(p_book_id) o on o.id = t.id
  where t.book_id = p_book_id
  group by 1
  order by 1 desc;
$$;

revoke all on function public.years_overview(uuid) from public, anon;
grant execute on function public.years_overview(uuid) to authenticated;
