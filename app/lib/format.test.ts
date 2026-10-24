import { describe, expect, it } from 'vitest';
import { formatRupiah, formatShort } from './format';

describe('formatShort', () => {
  it('meringkas juta dan ribu', () => {
    expect(formatShort(9062420)).toBe('9,06 jt');
    expect(formatShort(87300)).toBe('87 rb');
    expect(formatShort(500)).toBe('500');
  });

  it('versi rapat untuk sel kalender', () => {
    expect(formatShort(1500000, true)).toBe('1,5jt');
    expect(formatShort(55000, true)).toBe('55rb');
  });

  it('memakai karakter minus', () => {
    expect(formatShort(-1186750)).toBe('−1,19 jt');
  });
});

describe('formatRupiah', () => {
  it('memakai titik sebagai pemisah ribuan', () => {
    expect(formatRupiah(25000)).toBe('Rp 25.000');
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
  });

  it('menampilkan nol dan nilai negatif', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(-38648)).toBe('-Rp 38.648');
  });
});
