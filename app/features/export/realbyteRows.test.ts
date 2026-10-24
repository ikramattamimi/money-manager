import { describe, expect, it } from 'vitest';
import { parseRealbyte, serialToIso } from '../../../server/utils/realbyte';
import { isoToSerial, toRealbyteRows, type ExportTx } from './realbyteRows';

const ACCOUNTS: Record<string, string> = { a1: 'BCA', a2: 'Gopay', a3: 'Cash' };
const CATEGORIES: Record<string, { parent: string; child: string }> = {
  c1: { parent: '🥘 Food', child: '🍟 Snacks' },
  c2: { parent: '💰 Salary', child: '' },
};
const lookup = {
  account: (id: string | null) => (id ? (ACCOUNTS[id] ?? '') : ''),
  category: (id: string | null) => (id ? CATEGORIES[id]! : { parent: '', child: '' }),
};

const base = {
  fee: 0,
  to_account_id: null,
  category_id: null,
  is_adjustment: false,
  note: '',
  description: '',
};
const LIST: ExportTx[] = [
  {
    ...base,
    occurred_at: '2026-10-01T03:15:42.000Z',
    type: 'expense',
    amount: 25000,
    account_id: 'a1',
    category_id: 'c1',
    note: 'kopi',
  },
  {
    ...base,
    occurred_at: '2026-10-02T03:00:00.000Z',
    type: 'income',
    amount: 5_000_000,
    account_id: 'a1',
    category_id: 'c2',
  },
  {
    ...base,
    occurred_at: '2026-10-03T03:00:00.000Z',
    type: 'transfer',
    amount: 100000,
    fee: 2500,
    account_id: 'a1',
    to_account_id: 'a2',
  },
  {
    ...base,
    occurred_at: '2026-10-04T03:00:00.000Z',
    type: 'expense',
    amount: 7000,
    account_id: 'a3',
    is_adjustment: true,
    note: 'Koreksi saldo',
  },
];

describe('ekspor gaya Realbyte', () => {
  it('serial Excel bolak-balik tanpa geser waktu', () => {
    const iso = '2026-10-09T17:22:14.000Z';
    expect(serialToIso(isoToSerial(iso))).toBe(iso);
  });

  it('transfer jadi Out + In, biaya jadi pengeluaran', () => {
    const kinds = toRealbyteRows(LIST, lookup)
      .slice(1)
      .map((r) => r[6]);
    expect(kinds).toEqual([
      'Exp.',
      'Income',
      'Transfer-Out',
      'Transfer-In',
      'Exp.',
      'Expense Balance',
    ]);
  });

  it('bisa diimpor balik dengan total yang sama', async () => {
    const parsed = await parseRealbyte(toRealbyteRows(LIST, lookup));
    expect(parsed.errors).toEqual([]);
    expect(parsed.unpairedTransfers).toBe(0);
    const sum = (type: string) =>
      parsed.transactions
        .filter((t) => t.type === type && !t.isAdjustment)
        .reduce((s, t) => s + t.amount, 0);
    expect(sum('expense')).toBe(25000 + 2500);
    expect(sum('income')).toBe(5_000_000);
    expect(sum('transfer')).toBe(100000);
    expect(parsed.transactions.find((t) => t.isAdjustment)?.amount).toBe(7000);
    expect(parsed.transactions[0]).toMatchObject({
      occurredAt: '2026-10-01T03:15:42.000Z',
      category: 'expense:food/snacks',
      note: 'kopi',
    });
  });
});
