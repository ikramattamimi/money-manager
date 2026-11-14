-- Koreksi saldo bisa dicatat sebagai transaksi biasa (masuk statistik
-- pemasukan/pengeluaran) atau tetap sebagai koreksi (is_adjustment, default).
drop function if exists public.adjust_balance(uuid, bigint);

create function public.adjust_balance(
  p_account_id uuid,
  p_actual bigint,
  p_as_transaction boolean default false
)
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
    not p_as_transaction,
    'Koreksi saldo',
    'manual'
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

revoke all on function public.adjust_balance(uuid, bigint, boolean) from public, anon;
grant execute on function public.adjust_balance(uuid, bigint, boolean) to authenticated;
