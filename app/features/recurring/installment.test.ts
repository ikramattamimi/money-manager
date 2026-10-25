import { describe, expect, it } from 'vitest';
import { installmentPlan } from './installment';

describe('cicilan', () => {
  it('3 bulan Rp300.000 = 3 × Rp100.000, berhenti di cicilan ketiga', () => {
    expect(installmentPlan(300_000, 3, '2026-10-25', 25)).toEqual({
      amount: 100_000,
      endOn: '2026-12-25',
      rounding: 0,
    });
  });

  it('tanggal cicilan sudah lewat di bulan mulai: mulai bulan depan', () => {
    expect(installmentPlan(300_000, 3, '2026-10-26', 5)!.endOn).toBe('2027-01-05');
  });

  it('tanggal 31 jatuh ke hari terakhir bulan pendek', () => {
    expect(installmentPlan(400_000, 4, '2026-11-30', 31)!.endOn).toBe('2027-02-28');
  });

  it('total tidak habis dibagi dilaporkan sebagai selisih pembulatan', () => {
    expect(installmentPlan(100_000, 3, '2026-10-01', 1)).toMatchObject({
      amount: 33_333,
      rounding: -1,
    });
  });

  it('isian tidak lengkap', () => {
    expect(installmentPlan(0, 3, '2026-10-01', 1)).toBeNull();
    expect(installmentPlan(100_000, 1, '2026-10-01', 1)).toBeNull();
  });
});
