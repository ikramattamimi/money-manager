import { describe, expect, it } from 'vitest';
import {
  deltaFor,
  fromBalancesAt,
  fromLedger,
  monthPlan,
  runningBalances,
  type TxLike,
} from './months';

describe('rencana bulan', () => {
  it('6 bulan sampai Oktober, batas di awal tiap periode WIB', () => {
    const plan = monthPlan(2026, 10, 3);
    expect(plan.months).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
    ]);
    expect(plan.cuts).toEqual([
      '2026-07-31T17:00:00.000Z',
      '2026-08-31T17:00:00.000Z',
      '2026-09-30T17:00:00.000Z',
      '2026-10-31T17:00:00.000Z',
    ]);
  });

  it('melewati pergantian tahun', () => {
    expect(monthPlan(2026, 1, 2).months).toEqual([
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
    ]);
  });
});

describe('hasil RPC saldo per batas', () => {
  it('jadi saldo awal, akhir, masuk, keluar per bulan', () => {
    const plan = monthPlan(2026, 10, 2);
    const row = (cut: string, balance: number, inflow = 0, outflow = 0) => ({
      account_id: 'a',
      cut,
      balance,
      inflow,
      outflow,
    });
    const map = fromBalancesAt(
      [
        row('2026-08-31T17:00:00+00:00', 100),
        row('2026-09-30T17:00:00+00:00', 150, 80, 30),
        row('2026-10-31T17:00:00+00:00', 120, 0, 30),
      ],
      plan,
    );
    expect(map.get('a')).toEqual([
      { year: 2026, month: 9, start: 100, end: 150, inflow: 80, outflow: 30 },
      { year: 2026, month: 10, start: 150, end: 120, inflow: 0, outflow: 30 },
    ]);
  });
});

describe('cadangan dari riwayat akun', () => {
  const plan = monthPlan(2026, 10, 2);
  // Terbaru dulu, saldo awal 1000
  const rows = [
    { occurred_at: '2026-10-05T03:00:00Z', delta: -200, balance_after: 1300 },
    { occurred_at: '2026-09-20T03:00:00Z', delta: 500, balance_after: 1500 },
  ];

  it('riwayat lengkap: bulan tanpa transaksi memakai saldo awal', () => {
    expect(fromLedger(rows, 1000, true, plan)).toEqual([
      { year: 2026, month: 9, start: 1000, end: 1500, inflow: 500, outflow: 0 },
      { year: 2026, month: 10, start: 1500, end: 1300, inflow: 0, outflow: 200 },
    ]);
  });

  it('riwayat terpotong: bulan yang lebih tua tidak diketahui', () => {
    const result = fromLedger(rows.slice(0, 1), 1000, false, plan);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
  });
});

describe('saldo berjalan', () => {
  const tx = (id: string, at: string, t: Partial<TxLike>): TxLike => ({
    id,
    occurred_at: at,
    created_at: at,
    type: 'expense',
    amount: 0,
    fee: 0,
    account_id: 'a',
    to_account_id: null,
    ...t,
  });

  it('transfer keluar termasuk biaya, transfer masuk menambah', () => {
    expect(deltaFor(tx('1', '', { type: 'transfer', amount: 100, fee: 5 }), 'a')).toBe(-105);
    expect(
      deltaFor(
        tx('1', '', { type: 'transfer', amount: 100, account_id: 'b', to_account_id: 'a' }),
        'a',
      ),
    ).toBe(100);
  });

  it('mundur dari saldo akhir, terbaru dulu', () => {
    const list = [
      tx('old', '2026-10-01T03:00:00Z', { type: 'income', amount: 300 }),
      tx('new', '2026-10-02T03:00:00Z', { amount: 50 }),
    ];
    const map = runningBalances(list, 'a', 1000);
    expect(map.get('new')).toBe(1000);
    expect(map.get('old')).toBe(1050);
  });
});
