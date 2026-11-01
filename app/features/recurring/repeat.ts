import { addMonths, daysInMonth } from '@/lib/time';
import type { RecurringFrequency } from './api';

/*
 * Pilihan "Ulangi" di form catat (mockup REPEATS). Transaksi pertama dicatat
 * langsung; aturan berulang mulai di kejadian berikutnya supaya tidak dobel.
 */

export type RepeatOption =
  'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'monthEnd' | 'yearly';

export const REPEAT_OPTIONS: { value: RepeatOption; label: string; short: string }[] = [
  { value: 'none', label: 'Tidak', short: '' },
  { value: 'daily', label: 'Setiap hari', short: '1h' },
  { value: 'weekly', label: 'Setiap minggu', short: '1m' },
  { value: 'biweekly', label: 'Setiap 2 minggu', short: '2m' },
  { value: 'monthly', label: 'Setiap bulan', short: '1b' },
  { value: 'monthEnd', label: 'Akhir bulan', short: 'akh' },
  { value: 'yearly', label: 'Setiap tahun', short: '1t' },
];

/** Jumlah bulan cicilan yang bisa dipilih */
export const INSTALLMENT_MONTHS = [2, 3, 6, 12, 24] as const;

export interface RepeatRule {
  frequency: RecurringFrequency;
  interval: number;
  day_of_month: number | null;
  /** Kejadian berikutnya setelah transaksi yang dicatat sekarang, "YYYY-MM-DD" */
  start_on: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const key = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return key(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Aturan berulang untuk pilihan `option` dari transaksi di tanggal `day` (WIB) */
export function repeatRule(option: RepeatOption, day: string): RepeatRule | null {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const next = addMonths(y, m, 1);
  switch (option) {
    case 'daily':
      return { frequency: 'daily', interval: 1, day_of_month: null, start_on: addDays(day, 1) };
    case 'weekly':
      return { frequency: 'weekly', interval: 1, day_of_month: null, start_on: addDays(day, 7) };
    case 'biweekly':
      return { frequency: 'weekly', interval: 2, day_of_month: null, start_on: addDays(day, 14) };
    case 'monthly':
      return {
        frequency: 'monthly',
        interval: 1,
        day_of_month: d,
        start_on: key(next.year, next.month, Math.min(d, daysInMonth(next.year, next.month))),
      };
    case 'monthEnd':
      return {
        frequency: 'monthly',
        interval: 1,
        day_of_month: 31,
        start_on: key(next.year, next.month, daysInMonth(next.year, next.month)),
      };
    case 'yearly':
      return {
        frequency: 'yearly',
        interval: 1,
        day_of_month: null,
        start_on: key(y + 1, m, Math.min(d, daysInMonth(y + 1, m))),
      };
    default:
      return null;
  }
}
