-- ============================================================
-- RPC untuk tampilan transaksi dan akun (fase 4).
--
-- Semua SECURITY INVOKER: tunduk pada RLS, jadi hanya data buku yang
-- user ikuti. Bulan dihitung di zona Asia/Jakarta. Koreksi saldo
-- (is_adjustment) tidak dihitung sebagai pemasukan/pengeluaran.
-- ============================================================

-- Ringkasan per bulan dalam satu tahun (tab Bulanan)
create function public.months_overview(p_book_id uuid, p_year integer)
returns table (month integer, income bigint, expense bigint, tx_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    extract(month from t.occurred_at at time zone 'Asia/Jakarta')::integer as month,
    coalesce(sum(t.amount) filter (where t.type = 'income' and not t.is_adjustment), 0)::bigint,
    coalesce(sum(t.amount) filter (where t.type = 'expense' and not t.is_adjustment), 0)::bigint,
    count(*)::integer
  from public.transactions t
  where t.book_id = p_book_id
    and t.occurred_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'Asia/Jakarta')
    and t.occurred_at < make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'Asia/Jakarta')
  group by 1
  order by 1;
$$;

-- Riwayat satu akun dengan saldo berjalan (detail akun).
-- delta: efek transaksi ke akun ini (transfer keluar termasuk biaya).
-- balance_after: saldo akun setelah transaksi itu.
create function public.account_ledger(
  p_account_id uuid,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  occurred_at timestamptz,
  type public.transaction_type,
  amount bigint,
  fee bigint,
  delta bigint,
  balance_after bigint,
  is_adjustment boolean,
  note text,
  category_id uuid,
  account_id uuid,
  to_account_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with moves as (
    select
      t.id, t.occurred_at, t.created_at, t.type, t.amount, t.fee, t.is_adjustment, t.note,
      t.category_id, t.account_id, t.to_account_id,
      case
        when t.type = 'income' then t.amount
        when t.type = 'expense' then -t.amount
        when t.account_id = p_account_id then -(t.amount + t.fee)
        else t.amount
      end as delta
    from public.transactions t
    where t.account_id = p_account_id or t.to_account_id = p_account_id
  ),
  running as (
    select
      m.*,
      (select a.opening_balance from public.accounts a where a.id = p_account_id)
        + sum(m.delta) over (order by m.occurred_at, m.created_at, m.id) as balance_after
    from moves m
  )
  select
    r.id, r.occurred_at, r.type, r.amount, r.fee, r.delta, r.balance_after::bigint,
    r.is_adjustment, r.note, r.category_id, r.account_id, r.to_account_id
  from running r
  order by r.occurred_at desc, r.created_at desc, r.id desc
  limit p_limit offset p_offset;
$$;

-- Koreksi saldo: buat transaksi is_adjustment sebesar selisih antara saldo
-- tercatat dan saldo sebenarnya. Mengembalikan null kalau sudah sama.
create function public.adjust_balance(p_account_id uuid, p_actual bigint)
returns public.transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_account public.accounts;
  v_current bigint;
  v_diff bigint;
  v_tx public.transactions;
begin
  select * into v_account from public.accounts where id = p_account_id;
  if not found then
    raise exception 'Akun tidak ditemukan' using errcode = 'P0002';
  end if;

  select balance into v_current from public.account_balances where account_id = p_account_id;
  v_diff := p_actual - coalesce(v_current, v_account.opening_balance);
  if v_diff = 0 then
    return null;
  end if;

  insert into public.transactions (book_id, type, amount, account_id, is_adjustment, note, source)
  values (
    v_account.book_id,
    case when v_diff > 0 then 'income' else 'expense' end::public.transaction_type,
    abs(v_diff),
    p_account_id,
    true,
    'Koreksi saldo',
    'manual'
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

revoke all on function public.months_overview(uuid, integer) from public, anon;
revoke all on function public.account_ledger(uuid, integer, integer) from public, anon;
revoke all on function public.adjust_balance(uuid, bigint) from public, anon;
grant execute on function public.months_overview(uuid, integer) to authenticated;
grant execute on function public.account_ledger(uuid, integer, integer) to authenticated;
grant execute on function public.adjust_balance(uuid, bigint) to authenticated;
