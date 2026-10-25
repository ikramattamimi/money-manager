import { describe, expect, it } from 'vitest';
import { mergePhotoRows, toBase64, toStatementRows, type OcrResult } from './ocr';

const result = (
  transactions: OcrResult['transactions'],
  kind: OcrResult['kind'] = 'history',
): OcrResult => ({ kind, source: 'GoPay', transactions });

const tx = (over: Partial<OcrResult['transactions'][number]> = {}) => ({
  date: '2026-10-20',
  time: '12:30' as string | null,
  amount: 25000,
  direction: 'out' as const,
  counterparty: 'Kopi Kenangan',
  description: 'Pembayaran',
  ...over,
});

describe('hasil baca foto → baris mutasi', () => {
  it('memetakan baris dan menomori ulang', () => {
    const rows = toStatementRows(
      result([tx(), tx({ amount: 50000, direction: 'in', time: null })]),
      '2026-10-25',
    );
    expect(rows).toEqual([
      {
        row: 1,
        date: '2026-10-20',
        time: '12:30',
        amount: 25000,
        direction: 'out',
        counterparty: 'Kopi Kenangan',
        description: 'Pembayaran',
        balance: null,
      },
      {
        row: 2,
        date: '2026-10-20',
        time: null,
        amount: 50000,
        direction: 'in',
        counterparty: 'Kopi Kenangan',
        description: 'Pembayaran',
        balance: null,
      },
    ]);
  });

  it('membuang tanggal salah atau di masa depan, nominal nol, dan jam tidak valid', () => {
    const rows = toStatementRows(
      result([
        tx({ date: '2026-13-01' }),
        tx({ date: '2026-10-26' }),
        tx({ amount: 0 }),
        tx({ amount: -12000.4, time: '25:99' }),
      ]),
      '2026-10-25',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 12000, time: null });
  });

  it('pihak lawan kosong memakai nama sumber', () => {
    expect(
      toStatementRows(result([tx({ counterparty: '  ' })]), '2026-10-25')[0]!.counterparty,
    ).toBe('GoPay');
  });

  it('base64 tanpa Buffer', () => {
    expect(toBase64(new TextEncoder().encode('Money Manager'))).toBe(btoa('Money Manager'));
    const big = new Uint8Array(100_000).map((_, i) => i % 256);
    expect(atob(toBase64(big)).length).toBe(100_000);
  });
});

describe('gabung baris dari beberapa foto', () => {
  const rows = (list: ReturnType<typeof tx>[]) => toStatementRows(result(list), '2026-10-25');

  it('membuang baris yang sama di screenshot yang tumpang tindih', () => {
    const a = rows([tx({ time: '09:00' }), tx({ time: '12:30' })]);
    const b = rows([tx({ time: '12:30' }), tx({ time: '18:00' })]);
    const merged = mergePhotoRows([a, b]);
    expect(merged.map((r) => r.time)).toEqual(['09:00', '12:30', '18:00']);
    expect(merged.map((r) => r.row)).toEqual([1, 2, 3]);
  });

  it('tetap menyimpan transaksi kembar asli dalam satu foto', () => {
    const a = rows([tx(), tx()]);
    const b = rows([tx()]);
    expect(mergePhotoRows([a, b])).toHaveLength(2);
    expect(mergePhotoRows([b, a])).toHaveLength(2);
  });

  it('struk berbeda dengan nominal sama di toko berbeda tetap dua', () => {
    const a = rows([tx({ counterparty: 'Indomaret' })]);
    const b = rows([tx({ counterparty: 'Alfamart' })]);
    expect(mergePhotoRows([a, b])).toHaveLength(2);
  });
});
