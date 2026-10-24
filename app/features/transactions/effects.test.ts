import { describe, expect, it } from 'vitest';
import { balanceEffects, summarize } from './effects';

describe('balanceEffects', () => {
  it('transfer mengurangi asal termasuk biaya dan menambah tujuan', () => {
    const effects = balanceEffects({
      type: 'transfer',
      amount: 100000,
      fee: 2500,
      account_id: 'bca',
      to_account_id: 'gopay',
    });
    expect(effects.get('bca')).toBe(-102500);
    expect(effects.get('gopay')).toBe(100000);
  });

  it('pemasukan dan pengeluaran hanya menyentuh satu akun', () => {
    expect([
      ...balanceEffects({
        type: 'expense',
        amount: 25000,
        fee: 0,
        account_id: 'cash',
        to_account_id: null,
      }),
    ]).toEqual([['cash', -25000]]);
  });
});

describe('summarize', () => {
  it('tidak menghitung koreksi saldo dan transfer', () => {
    expect(
      summarize([
        { type: 'income', amount: 5000, is_adjustment: false },
        { type: 'expense', amount: 2000, is_adjustment: false },
        { type: 'income', amount: 9999, is_adjustment: true },
        { type: 'transfer', amount: 100, is_adjustment: false },
      ]),
    ).toEqual({ income: 5000, expense: 2000, net: 3000 });
  });
});
