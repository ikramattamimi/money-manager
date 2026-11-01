import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, parseBackup, remapBackup, type BookBackup } from './backup';

// Baris minimal; kolom yang tidak dipakai pemetaan diisi seadanya
const backup = (): BookBackup =>
  ({
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: '2026-11-01T00:00:00Z',
    book: { name: 'Pribadi', month_start_day: 25, currency: 'IDR' },
    accountGroups: [{ id: 'g1', name: 'Bank', kind: 'bank', icon: null, tone: null, sort: 0 }],
    accountTotals: [{ id: 'tot1', name: 'Uang bulanan', on_transactions: true, sort: 0 }],
    accounts: [
      { id: 'a1', group_id: 'g1', total_id: 'tot1', name: 'BCA', opening_balance: 100 },
      { id: 'a2', group_id: 'g1', total_id: null, name: 'Jago', opening_balance: 0 },
    ],
    categories: [
      { id: 'c2', parent_id: 'c1', kind: 'expense', name: 'Kopi' },
      { id: 'c1', parent_id: null, kind: 'expense', name: 'Makan' },
    ],
    recurringRules: [{ id: 'r1', account_id: 'a1', to_account_id: null, category_id: 'c1' }],
    transactions: [
      { id: 't1', type: 'expense', account_id: 'a1', category_id: 'c2', recurring_rule_id: 'r1' },
      { id: 't2', type: 'income', account_id: 'a1', category_id: null, recurring_rule_id: null },
      { id: 't3', type: 'transfer', account_id: 'a1', to_account_id: 'a2', category_id: null },
    ],
    transactionOffsets: [{ id: 'o1', expense_id: 't1', income_id: 't2', amount: 5 }],
    budgets: [{ id: 'b1', category_id: 'c1', amount: 1000, start_on: '2026-11-01' }],
    templates: [{ id: 'p1', account_id: 'a2', category_id: null, name: 'Parkir' }],
  }) as unknown as BookBackup;

describe('remapBackup', () => {
  let n = 0;
  const newId = () => `new-${++n}`;
  const rows = remapBackup(backup(), 'book-x', newId);
  const idOf = (list: { id?: string; name?: string }[], name: string) =>
    list.find((r) => r.name === name)!.id;

  it('memakai buku tujuan dan ID baru di semua baris', () => {
    const all = Object.values(rows).flat() as { id?: string; book_id: string }[];
    expect(all.every((r) => r.book_id === 'book-x')).toBe(true);
    expect(all.every((r) => r.id?.startsWith('new-'))).toBe(true);
  });

  it('memetakan relasi akun, total, dan grup', () => {
    const bca = rows.accounts.find((a) => a.name === 'BCA')!;
    expect(bca.group_id).toBe(rows.accountGroups[0]!.id);
    expect(bca.total_id).toBe(rows.accountTotals[0]!.id);
  });

  it('kategori induk disisipkan sebelum anaknya', () => {
    expect(rows.categories.map((c) => c.name)).toEqual(['Makan', 'Kopi']);
    expect(rows.categories[1]!.parent_id).toBe(idOf(rows.categories, 'Makan'));
  });

  it('transaksi, kaitan, budget, berulang ikut dipetakan', () => {
    const [t1, t2, t3] = rows.transactions;
    expect(t1!.category_id).toBe(idOf(rows.categories, 'Kopi'));
    expect(t1!.recurring_rule_id).toBe(rows.recurringRules[0]!.id);
    expect(t3!.to_account_id).toBe(idOf(rows.accounts, 'Jago'));
    expect(rows.transactionOffsets[0]).toMatchObject({ expense_id: t1!.id, income_id: t2!.id });
    expect(rows.budgets[0]!.category_id).toBe(idOf(rows.categories, 'Makan'));
    expect(rows.templates[0]!.account_id).toBe(idOf(rows.accounts, 'Jago'));
  });

  it('menolak backup dengan relasi yang hilang', () => {
    const broken = backup();
    broken.accounts[0]!.group_id = 'tidak-ada';
    expect(() => remapBackup(broken, 'b', newId)).toThrow('grup akun');
  });
});

describe('parseBackup', () => {
  it('menerima backup yang valid', () => {
    expect(parseBackup(JSON.stringify(backup())).book.name).toBe('Pribadi');
  });

  it('menolak file lain dengan pesan jelas', () => {
    expect(() => parseBackup('bukan json')).toThrow('bukan JSON');
    expect(() => parseBackup('{"format":"lain"}')).toThrow('bukan backup');
    expect(() => parseBackup(JSON.stringify({ ...backup(), version: 99 }))).toThrow('lebih baru');
  });
});
