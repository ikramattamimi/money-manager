-- Statistik per catatan (redesign R5, mockup stats-note): total pemasukan atau
-- pengeluaran per catatan (toko/tempat) di [p_from, p_to). Catatan dibandingkan
-- tanpa beda huruf besar/kecil dan spasi di ujung; yang kosong dilewati.
-- Nominal bersih setelah kaitan reimburse/utang, sama seperti category_breakdown.
create or replace function public.note_breakdown(
  p_book_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_type public.transaction_type
)
returns table (note text, total bigint, tx_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    -- Ejaan yang paling sering dipakai untuk catatan itu
    mode() within group (order by btrim(t.note)) as note,
    sum(t.amount - coalesce(o.linked, 0))::bigint as total,
    (count(*) filter (where t.amount > coalesce(o.linked, 0)))::integer as tx_count
  from public.transactions t
  left join private.offsets_by_tx(p_book_id) o on o.id = t.id
  where t.book_id = p_book_id
    and t.type = p_type
    and p_type <> 'transfer'
    and not t.is_adjustment
    and btrim(t.note) <> ''
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by lower(btrim(t.note))
  having sum(t.amount - coalesce(o.linked, 0)) > 0
  order by 2 desc;
$$;

grant execute on function public.note_breakdown(uuid, timestamptz, timestamptz, public.transaction_type)
  to authenticated;
