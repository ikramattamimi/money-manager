import { DAYS_SHORT, MONTHS_SHORT, dayKey } from '@/lib/time';
import type { Transaction } from './api';
import { netAmount } from './effects';

/*
 * Pengelompokan daftar transaksi untuk tab Transaksi (mockup dayGroups,
 * weeks, cells). Fungsi murni supaya bisa diuji tanpa Vue.
 * Kunci hari "YYYY-MM-DD" dalam WIB; minggu mulai Senin.
 */

export type GroupTx = Pick<
  Transaction,
  'id' | 'type' | 'amount' | 'is_adjustment' | 'linked' | 'occurred_at'
>;

export interface Sums {
  income: number;
  expense: number;
}

/** Masuk/keluar satu transaksi; koreksi saldo dan transfer tidak dihitung */
function add(sums: Sums, t: GroupTx) {
  if (t.is_adjustment) return;
  if (t.type === 'income') sums.income += netAmount(t);
  if (t.type === 'expense') sums.expense += netAmount(t);
}

/** Masuk/keluar per hari */
export function sumsByDay(list: GroupTx[]): Record<string, Sums> {
  const out: Record<string, Sums> = {};
  for (const t of list) add((out[dayKey(t.occurred_at)] ??= { income: 0, expense: 0 }), t);
  return out;
}

export interface DayGroup<T extends GroupTx> extends Sums {
  key: string;
  items: T[];
}

/** Grup harian, hari terbaru di atas, transaksi terbaru di atas dalam satu hari */
export function groupByDay<T extends GroupTx>(list: T[]): DayGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const t of list) {
    const key = dayKey(t.occurred_at);
    const items = map.get(key);
    if (items) items.push(t);
    else map.set(key, [t]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => {
      const sorted = items.slice().sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));
      const sums = { income: 0, expense: 0 };
      for (const t of sorted) add(sums, t);
      return { key, items: sorted, ...sums };
    });
}

/** 0 = Minggu … 6 = Sabtu untuk kunci hari */
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Bagian kepala hari: "30", "Kam", "10/2026", nada hari (Sabtu biru, Minggu merah) */
export function dayParts(key: string) {
  const wd = weekdayOf(key);
  return {
    num: Number(key.slice(8)),
    weekday: DAYS_SHORT[wd]!,
    monthYear: `${key.slice(5, 7)}/${key.slice(0, 4)}`,
    tone: wd === 6 ? ('sat' as const) : wd === 0 ? ('sun' as const) : null,
  };
}

/** "30 Okt" */
export function shortDate(key: string): string {
  return `${Number(key.slice(8))} ${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]}`;
}

export interface WeekRow extends Sums {
  from: string;
  to: string;
  /** Hari ini ada di minggu ini */
  current: boolean;
}

/**
 * Minggu (Senin–Minggu) di dalam satu periode. Minggu pertama dan terakhir
 * bisa terpotong batas periode. Diurutkan dari minggu terbaru.
 */
export function weeksOf(days: string[], sums: Record<string, Sums>, today: string): WeekRow[] {
  const weeks: WeekRow[] = [];
  let week: WeekRow | null = null;
  for (const key of days) {
    if (!week || weekdayOf(key) === 1) {
      week = { from: key, to: key, income: 0, expense: 0, current: false };
      weeks.push(week);
    }
    week.to = key;
    week.income += sums[key]?.income ?? 0;
    week.expense += sums[key]?.expense ?? 0;
    if (key === today) week.current = true;
  }
  return weeks.reverse();
}

/** Kosong sebelum hari pertama di grid kalender yang mulai Senin */
export function mondayOffset(firstDay: string): number {
  return (weekdayOf(firstDay) + 6) % 7;
}
