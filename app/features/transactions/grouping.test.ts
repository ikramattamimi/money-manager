import { describe, expect, it } from 'vitest';
import { dayParts, groupByDay, mondayOffset, sumsByDay, weekdayOf, weeksOf } from './grouping';

// 08:00 WIB = 01:00 UTC
const at = (day: string, hour = 8) =>
  new Date(`${day}T${String(hour).padStart(2, '0')}:00:00+07:00`).toISOString();
const tx = (
  id: string,
  day: string,
  type: 'income' | 'expense' | 'transfer',
  amount: number,
  hour = 8,
) => ({
  id,
  type,
  amount,
  is_adjustment: false,
  linked: [],
  occurred_at: at(day, hour),
});

describe('groupByDay', () => {
  it('hari terbaru di atas, jam terbaru di atas, transfer tidak dihitung', () => {
    const groups = groupByDay([
      tx('a', '2026-10-29', 'expense', 10_000, 9),
      tx('b', '2026-10-30', 'income', 50_000),
      tx('c', '2026-10-29', 'expense', 5_000, 20),
      tx('d', '2026-10-29', 'transfer', 70_000),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['2026-10-30', '2026-10-29']);
    expect(groups[1]!.items.map((t) => t.id)).toEqual(['c', 'a', 'd']);
    expect(groups[1]).toMatchObject({ income: 0, expense: 15_000 });
  });

  it('memakai tanggal WIB, bukan UTC', () => {
    // 23:30 WIB 30 Okt = 16:30 UTC 30 Okt; 00:30 WIB 31 Okt = 17:30 UTC 30 Okt
    const groups = groupByDay([tx('a', '2026-10-31', 'expense', 1, 0)]);
    expect(groups[0]!.key).toBe('2026-10-31');
  });
});

describe('weeks', () => {
  it('membagi periode ke minggu Senin–Minggu, terbaru di atas', () => {
    const days = Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    const sums = sumsByDay([
      tx('a', '2026-10-05', 'expense', 1_000),
      tx('b', '2026-10-31', 'income', 2_000),
    ]);
    const weeks = weeksOf(days, sums, '2026-10-30');
    // 1 Okt 2026 = Kamis: 1–4, 5–11, 12–18, 19–25, 26–31
    expect(weeks.map((w) => `${w.from.slice(8)}-${w.to.slice(8)}`)).toEqual([
      '26-31',
      '19-25',
      '12-18',
      '05-11',
      '01-04',
    ]);
    expect(weeks[0]).toMatchObject({ income: 2_000, current: true });
    expect(weeks[3]).toMatchObject({ expense: 1_000, current: false });
  });

  it('hari minggu dan offset kalender', () => {
    expect(weekdayOf('2026-11-01')).toBe(0); // Minggu
    expect(mondayOffset('2026-10-01')).toBe(3); // Kamis
    expect(dayParts('2026-10-31')).toMatchObject({
      num: 31,
      weekday: 'Sab',
      tone: 'sat',
      monthYear: '10.2026',
    });
  });
});
