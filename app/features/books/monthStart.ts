import { addMonths, dayKey, MONTHS_SHORT, periodOf, periodRangeLabel } from '@/lib/time';

/**
 * Keterangan tanggal awal bulan untuk periode berjalan: "Periode Okt = 25 Sep – 24 Okt".
 * `long` menambah periode berikutnya. Tanggal 1 = bulan kalender.
 */
export function monthStartCaption(day: number, long = false, today = new Date()): string {
  if (day <= 1) return 'Bulan mengikuti kalender, tanggal 1 sampai akhir bulan';
  const p = periodOf(dayKey(today), day);
  const now = `Periode ${MONTHS_SHORT[p.month - 1]} = ${periodRangeLabel(p.year, p.month, day)}`;
  if (!long) return now;
  const n = addMonths(p.year, p.month, 1);
  return `${now}, ${MONTHS_SHORT[n.month - 1]} = ${periodRangeLabel(n.year, n.month, day)}`;
}
