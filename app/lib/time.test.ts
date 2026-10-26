import { describe, expect, it } from 'vitest';
import {
  addMonths,
  dayKey,
  dayLabel,
  firstWeekdayMondayBased,
  fromLocalInput,
  jakartaParts,
  periodDays,
  periodOf,
  periodRange,
  periodRangeLabel,
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
    expect(periodRange(2026, 10)).toEqual({
      from: '2026-09-30T17:00:00.000Z',
      to: '2026-10-31T17:00:00.000Z',
    });
    expect(periodRange(2026, 12).to).toBe('2026-12-31T17:00:00.000Z');
  });

  it('tanggal awal 25 (20–31): Oktober = 25 Sep – 24 Okt', () => {
    expect(periodRange(2026, 10, 25)).toEqual({
      from: '2026-09-24T17:00:00.000Z',
      to: '2026-10-24T17:00:00.000Z',
    });
    expect(periodRangeLabel(2026, 10, 25)).toBe('25 Sep – 24 Okt');
    expect(periodRangeLabel(2026, 10, 1)).toBe('');
    // 24 Okt 23.59 WIB masih Oktober, 25 Okt 00.00 WIB sudah November
    expect(periodOf('2026-10-24T16:59:00Z', 25)).toEqual({ year: 2026, month: 10 });
    expect(periodOf('2026-10-24T17:00:00Z', 25)).toEqual({ year: 2026, month: 11 });
    expect(periodOf('2026-01-10', 25)).toEqual({ year: 2026, month: 1 });
    expect(periodOf('2025-12-28', 25)).toEqual({ year: 2026, month: 1 });
    expect(periodDays(2026, 10, 25)).toHaveLength(30);
  });

  it('tanggal awal di bawah 20 tetap mulai di bulan namanya', () => {
    expect(periodRangeLabel(2026, 10, 19)).toBe('19 Okt – 18 Nov');
    expect(periodOf('2026-10-18', 19)).toEqual({ year: 2026, month: 9 });
    expect(periodOf('2026-10-19', 19)).toEqual({ year: 2026, month: 10 });
  });

  it('tanggal awal 31 jatuh ke hari terakhir bulan pendek', () => {
    expect(periodRangeLabel(2027, 3, 31)).toBe('28 Feb – 30 Mar');
    expect(periodOf('2027-03-30', 31)).toEqual({ year: 2027, month: 3 });
    expect(periodOf('2027-03-31', 31)).toEqual({ year: 2027, month: 4 });
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
