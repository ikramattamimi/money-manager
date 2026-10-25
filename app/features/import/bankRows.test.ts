import { describe, expect, it } from 'vitest';
import type { ReconciledRow } from '#shared/types/bank';
import { initialChoice, needsAccount, toCommitRow } from './bankRows';

const row = (over: Partial<ReconciledRow> = {}): ReconciledRow => ({
  row: 1,
  date: '2026-10-03',
  time: null,
  amount: 200_000,
  direction: 'out',
  counterparty: 'Toko Kopi',
  description: 'Pembayaran',
  balance: 100,
  status: 'baru',
  matchIds: [],
  counterAccountId: null,
  note: 'Toko Kopi',
  dedupeKey: `bk:${'a'.repeat(40)}`,
  suggestion: { categoryId: 'cat-kopi', type: 'expense' },
  ...over,
});

describe('pilihan awal', () => {
  it('baru dan transfer ikut, ragu dan tercatat tidak; saran kategori dipakai', () => {
    expect(initialChoice(row())).toEqual({
      include: true,
      transfer: false,
      categoryId: 'cat-kopi',
      counterAccountId: null,
    });
    expect(initialChoice(row({ status: 'transfer', counterAccountId: 'jago' }))).toMatchObject({
      include: true,
      transfer: true,
    });
    expect(initialChoice(row({ status: 'ragu' })).include).toBe(false);
    expect(initialChoice(row({ status: 'tercatat' })).include).toBe(false);
  });

  it('transfer tanpa akun lawan belum bisa disimpan', () => {
    expect(
      needsAccount({ include: true, transfer: true, categoryId: null, counterAccountId: null }),
    ).toBe(true);
    expect(
      needsAccount({ include: false, transfer: true, categoryId: null, counterAccountId: null }),
    ).toBe(false);
  });
});

describe('baris yang dikirim', () => {
  it('pengeluaran dengan kategori, jam tengah hari, keterangan bank', () => {
    expect(toCommitRow(row(), initialChoice(row()), 'sea')).toEqual({
      occurredAt: '2026-10-03T12:00:00+07:00',
      type: 'expense',
      amount: 200_000,
      accountId: 'sea',
      toAccountId: null,
      categoryId: 'cat-kopi',
      note: 'Toko Kopi',
      description: 'Toko Kopi · Pembayaran',
      dedupeKey: `bk:${'a'.repeat(40)}`,
    });
  });

  it('transfer keluar dari akun mutasi, transfer masuk ke akun mutasi', () => {
    const c = { include: true, transfer: true, categoryId: 'x', counterAccountId: 'jago' };
    expect(toCommitRow(row(), c, 'sea')).toMatchObject({
      type: 'transfer',
      accountId: 'sea',
      toAccountId: 'jago',
      categoryId: null,
    });
    expect(toCommitRow(row({ direction: 'in', time: '08:30' }), c, 'sea')).toMatchObject({
      type: 'transfer',
      accountId: 'jago',
      toAccountId: 'sea',
      occurredAt: '2026-10-03T08:30:00+07:00',
    });
  });

  it('pemasukan', () => {
    expect(toCommitRow(row({ direction: 'in' }), initialChoice(row()), 'sea').type).toBe('income');
  });
});
