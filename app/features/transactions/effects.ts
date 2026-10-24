import type { Transaction } from './api';

type BalanceInput = Pick<Transaction, 'type' | 'amount' | 'fee' | 'account_id' | 'to_account_id'>;

/**
 * Efek satu transaksi ke saldo tiap akun (sama dengan view account_balances).
 * Dipakai untuk optimistic update; angka resmi tetap dari database.
 */
export function balanceEffects(tx: BalanceInput): Map<string, number> {
  const effects = new Map<string, number>();
  const add = (id: string, delta: number) => effects.set(id, (effects.get(id) ?? 0) + delta);
  if (tx.type === 'income') add(tx.account_id, tx.amount);
  else if (tx.type === 'expense') add(tx.account_id, -tx.amount);
  else {
    add(tx.account_id, -(tx.amount + (tx.fee ?? 0)));
    if (tx.to_account_id) add(tx.to_account_id, tx.amount);
  }
  return effects;
}

/** Ringkasan satu bulan; koreksi saldo tidak dihitung sebagai masuk/keluar */
export function summarize(list: Pick<Transaction, 'type' | 'amount' | 'is_adjustment'>[]) {
  let income = 0;
  let expense = 0;
  for (const t of list) {
    if (t.is_adjustment) continue;
    if (t.type === 'income') income += t.amount;
    if (t.type === 'expense') expense += t.amount;
  }
  return { income, expense, net: income - expense };
}
