import { describe, expect, it } from 'vitest';
import { repeatRule } from './repeat';

describe('repeatRule', () => {
  it('tidak berulang = tanpa aturan', () => {
    expect(repeatRule('none', '2026-10-30')).toBeNull();
  });

  it('harian dan mingguan mulai di kejadian berikutnya', () => {
    expect(repeatRule('daily', '2026-12-31')).toMatchObject({
      frequency: 'daily',
      start_on: '2027-01-01',
    });
    expect(repeatRule('weekly', '2026-10-30')).toMatchObject({
      interval: 1,
      start_on: '2026-11-06',
    });
    expect(repeatRule('biweekly', '2026-10-30')).toMatchObject({
      frequency: 'weekly',
      interval: 2,
      start_on: '2026-11-13',
    });
  });

  it('bulanan memakai tanggal yang sama, dipotong di bulan pendek', () => {
    expect(repeatRule('monthly', '2026-01-31')).toMatchObject({
      frequency: 'monthly',
      day_of_month: 31,
      start_on: '2026-02-28',
    });
  });

  it('akhir bulan selalu hari terakhir', () => {
    expect(repeatRule('monthEnd', '2026-10-15')).toMatchObject({
      day_of_month: 31,
      start_on: '2026-11-30',
    });
  });

  it('tahunan, 29 Feb ke 28 Feb', () => {
    expect(repeatRule('yearly', '2028-02-29')).toMatchObject({
      frequency: 'yearly',
      start_on: '2029-02-28',
    });
  });
});
