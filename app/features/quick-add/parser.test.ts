import { describe, expect, it } from 'vitest';
import { parseQuick } from './parser';
import type { QuickAccount, QuickCategory } from './types';

const accounts: QuickAccount[] = [
  { id: 'cash', name: 'Tunai', aliases: ['tunai', 'cash'] },
  { id: 'bca', name: 'BCA', aliases: ['bca'] },
  { id: 'gopay', name: 'GoPay', aliases: ['gopay'] },
];
const icon = {} as QuickCategory['icon'];
const categories: QuickCategory[] = [
  { id: 'coffee', name: 'Kopi', kind: 'expense', icon, tone: 'r2', keywords: ['kopi'] },
  { id: 'fuel', name: 'Bensin', kind: 'expense', icon, tone: 'r5', keywords: ['bensin'] },
  { id: 'salary', name: 'Gaji', kind: 'income', icon, tone: 'r3', keywords: ['gaji'] },
];
const parse = (text: string) => parseQuick(text, { accounts, categories });

describe('parseQuick', () => {
  it('membaca nominal, akun, dan kategori', () => {
    expect(parse('kopi 25rb gopay')).toMatchObject({
      amount: 25000,
      accountId: 'gopay',
      categoryId: 'coffee',
      note: 'kopi',
      type: null,
    });
  });

  it('mengenali transfer dan pemasukan', () => {
    expect(parse('bca > gopay 99rb')).toMatchObject({
      type: 'transfer',
      accountId: 'bca',
      toAccountId: 'gopay',
      amount: 99000,
    });
    expect(parse('+ gaji 5jt bca')).toMatchObject({
      type: 'income',
      amount: 5_000_000,
      categoryId: 'salary',
    });
  });

  it('membaca titik ribuan dan kata waktu', () => {
    expect(parse('makan siang 35.000')).toMatchObject({ amount: 35000, note: 'makan siang' });
    expect(parse('bensin 100rb kemarin')).toMatchObject({
      amount: 100000,
      date: 'yesterday',
      categoryId: 'fuel',
    });
  });
});
