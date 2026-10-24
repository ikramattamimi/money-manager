import { describe, expect, it } from 'vitest';
import { formatRupiah } from './format';

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
