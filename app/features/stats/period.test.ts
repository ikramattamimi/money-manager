import { describe, expect, it } from 'vitest';
import { hasNext, periodBounds, shiftPeriod, todayWib } from './period';

// Minggu, 25 Okt 2026 00.30 WIB (masih Sabtu 24 Okt di UTC)
const NOW = new Date('2026-10-24T17:30:00Z');

describe('periode statistik', () => {
  it('hari ini menurut WIB', () => {
    expect(todayWib(NOW)).toBe('2026-10-25');
  });

  it('bulan: [1 Okt, 1 Nov) WIB', () => {
    expect(periodBounds({ kind: 'month', anchor: '2026-10-25' })).toEqual({
      from: '2026-09-30T17:00:00.000Z',
      to: '2026-10-31T17:00:00.000Z',
      label: 'Oktober 2026',
      endYear: 2026,
      endMonth: 10,
    });
  });

  it('minggu dimulai Senin', () => {
    const b = periodBounds({ kind: 'week', anchor: '2026-10-25' });
    expect(b.label).toBe('19 Okt – 25 Okt 2026');
    expect(b.from).toBe('2026-10-18T17:00:00.000Z');
    expect(b.to).toBe('2026-10-25T17:00:00.000Z');
  });

  it('minggu lintas tahun', () => {
    expect(periodBounds({ kind: 'week', anchor: '2027-01-01' }).label).toBe(
      '28 Des 2026 – 3 Jan 2027',
    );
  });

  it('tahun dan rentang', () => {
    expect(periodBounds({ kind: 'year', anchor: '2026-10-25' }).label).toBe('2026');
    const r = periodBounds({
      kind: 'range',
      anchor: '2026-10-25',
      from: '2026-10-01',
      to: '2026-10-15',
    });
    expect(r.label).toBe('1 Okt – 15 Okt 2026');
    expect(r.to).toBe('2026-10-15T17:00:00.000Z');
  });

  it('geser periode', () => {
    expect(shiftPeriod({ kind: 'month', anchor: '2026-01-31' }, -1).anchor).toBe('2025-12-01');
    expect(shiftPeriod({ kind: 'week', anchor: '2026-10-25' }, -1).anchor).toBe('2026-10-18');
    expect(
      shiftPeriod({ kind: 'range', anchor: '', from: '2026-10-01', to: '2026-10-15' }, -1),
    ).toMatchObject({
      from: '2026-09-16',
      to: '2026-09-30',
    });
  });

  it('tidak bisa maju ke periode yang belum dimulai', () => {
    expect(hasNext({ kind: 'month', anchor: '2026-10-01' }, NOW)).toBe(false);
    expect(hasNext({ kind: 'month', anchor: '2026-09-01' }, NOW)).toBe(true);
    expect(hasNext({ kind: 'week', anchor: '2026-10-25' }, NOW)).toBe(false);
  });

  it('tanggal awal bulan 25: periode, geser, dan ujung tren mengikutinya', () => {
    const b = periodBounds({ kind: 'month', anchor: '2026-10-10' }, 25);
    expect(b).toMatchObject({
      label: 'September 2026',
      range: '25 Sep – 24 Okt',
      from: '2026-09-24T17:00:00.000Z',
      to: '2026-10-24T17:00:00.000Z',
      endMonth: 9,
    });
    expect(shiftPeriod({ kind: 'month', anchor: '2026-10-10' }, 1, 25).anchor).toBe('2026-10-25');
    // 25 Okt 00.30 WIB: periode Oktober sudah dimulai, November belum
    expect(hasNext({ kind: 'month', anchor: '2026-10-10' }, NOW, 25)).toBe(true);
    expect(hasNext({ kind: 'month', anchor: '2026-10-25' }, NOW, 25)).toBe(false);
    expect(periodBounds({ kind: 'year', anchor: '2026-10-25' }, 25).from).toBe(
      '2026-01-24T17:00:00.000Z',
    );
    expect(periodBounds({ kind: 'week', anchor: '2026-10-21' }, 25).endMonth).toBe(10);
    expect(periodBounds({ kind: 'month', anchor: '2026-10-10' }).range).toBeUndefined();
  });
});
