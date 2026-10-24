import { describe, expect, it } from 'vitest';
import {
  addMonths,
  dayKey,
  dayLabel,
  firstWeekdayMondayBased,
  fromLocalInput,
  jakartaParts,
  monthRange,
  toLocalInput,
} from './time';

describe('waktu WIB', () => {
  it('membaca tanggal menurut WIB, bukan UTC', () => {
    // 31 Okt 17:30 UTC = 1 Nov 00:30 WIB
    expect(jakartaParts('2026-10-31T17:30:00Z')).toMatchObject({
      year: 2026,
      month: 11,
      day: 1,
      hour: 0,
    });
    expect(dayKey('2026-10-31T16:59:00Z')).toBe('2026-10-31');
  });

  it('rentang bulan dimulai tengah malam WIB', () => {
    expect(monthRange(2026, 10)).toEqual({
      from: '2026-09-30T17:00:00.000Z',
      to: '2026-10-31T17:00:00.000Z',
    });
    expect(monthRange(2026, 12).to).toBe('2026-12-31T17:00:00.000Z');
  });

  it('berpindah bulan melewati tahun', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('kolom kalender dimulai Senin', () => {
    expect(firstWeekdayMondayBased(2026, 10)).toBe(3); // 1 Okt 2026 hari Kamis
  });

  it('input datetime-local bolak-balik dalam WIB', () => {
    expect(toLocalInput('2026-10-24T07:05:00Z')).toBe('2026-10-24T14:05');
    expect(fromLocalInput('2026-10-24T14:05')).toBe('2026-10-24T07:05:00.000Z');
  });

  it('label hari relatif terhadap sekarang', () => {
    const now = new Date('2026-10-24T07:00:00Z');
    expect(dayLabel('2026-10-24T01:00:00Z', now)).toBe('Hari ini');
    expect(dayLabel('2026-10-23T01:00:00Z', now)).toBe('Kemarin');
    expect(dayLabel('2026-10-18T01:00:00Z', now)).toBe('Min, 18 Okt');
  });
});
