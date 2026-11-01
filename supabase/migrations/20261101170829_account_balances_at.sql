-- Saldo akun pada titik waktu tertentu (redesign R6, mockup accounts /
-- account-detail): saldo per akhir bulan terpilih, tren aset bersih 6 bulan,
-- dan tab Bulanan di rincian akun. Belum ada RPC saldo historis; view
-- account_balances hanya saldo sekarang.
--
-- p_cuts: batas waktu berurutan naik, mis. awal periode 6 bulan + awal periode
-- sesudahnya (dihitung di client dengan periodRange, jadi tanggal awal bulan
-- buku ikut). Per akun per batas:
--   balance = saldo awal + semua transaksi sebelum batas (sama dengan
--             account_balances kalau batas = sekarang)
--   inflow / outflow = uang masuk / keluar akun di [batas sebelumnya, batas),
--             termasuk transfer, biaya transfer, dan koreksi saldo, jadi
--             saldo batas sebelumnya + inflow − outflow = balance.
--             Batas pertama selalu 0.
-- Cara hitung saldo sama dengan account_balances (tidak diubah).

create or replace function public.account_balances_at(p_book_id uuid, p_cuts timestamptz[])
returns table (account_id uuid, cut timestamptz, balance bigint, inflow bigint, outflow bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with cuts as (
    select c.cut, c.i, lag(c.cut) over (order by c.i) as prev
    from unnest(p_cuts) with ordinality as c(cut, i)
  ),
  moves as (
    select
      t.account_id,
      t.occurred_at,
      case t.type
        when 'income' then t.amount
        when 'expense' then -t.amount
        else -(t.amount + t.fee)
      end as delta
    from public.transactions t
    where t.book_id = p_book_id
    union all
    -- sisi penerima transfer
    select t.to_account_id, t.occurred_at, t.amount
    from public.transactions t
    where t.book_id = p_book_id
      and t.type = 'transfer'
      and t.to_account_id is not null
  )
  select
    a.id as account_id,
    c.cut,
    (a.opening_balance + coalesce(sum(m.delta) filter (where m.occurred_at < c.cut), 0))::bigint
      as balance,
    coalesce(sum(m.delta) filter (
      where m.delta > 0 and m.occurred_at >= c.prev and m.occurred_at < c.cut
    ), 0)::bigint as inflow,
    coalesce(-sum(m.delta) filter (
      where m.delta < 0 and m.occurred_at >= c.prev and m.occurred_at < c.cut
    ), 0)::bigint as outflow
  from public.accounts a
  cross join cuts c
  left join moves m on m.account_id = a.id
  where a.book_id = p_book_id
  group by a.id, a.opening_balance, c.cut, c.i
  order by c.i, a.id;
$$;

revoke all on function public.account_balances_at(uuid, timestamptz[]) from public, anon;
grant execute on function public.account_balances_at(uuid, timestamptz[]) to authenticated;
