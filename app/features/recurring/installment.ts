import { addMonths, daysInMonth } from '@/lib/time';

// Cicilan (fase 11 T4): pengeluaran yang dicicil N bulan = aturan berulang
// bulanan dengan tanggal akhir di cicilan ke-N, jadi berhenti sendiri.

export interface InstallmentPlan {
  /** Nominal per bulan (dibulatkan ke rupiah) */
  amount: number;
  /** Tanggal cicilan terakhir, "YYYY-MM-DD" (end_on aturan berulang) */
  endOn: string;
  /** amount × bulan − total; bukan nol kalau total tidak habis dibagi */
  rounding: number;
}

export function installmentPlan(
  total: number,
  months: number,
  startOn: string,
  dayOfMonth: number,
): InstallmentPlan | null {
  if (total <= 0 || months < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(startOn)) return null;
  const amount = Math.round(total / months);
  const [y, m, d] = startOn.split('-').map(Number) as [number, number, number];
  // Cicilan pertama di bulan mulai kalau tanggalnya belum lewat, kalau tidak bulan depan
  const firstMonth = d <= dayOfMonth ? { year: y, month: m } : addMonths(y, m, 1);
  const last = addMonths(firstMonth.year, firstMonth.month, months - 1);
  const day = Math.min(dayOfMonth, daysInMonth(last.year, last.month));
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    amount,
    endOn: `${last.year}-${pad(last.month)}-${pad(day)}`,
    rounding: amount * months - total,
  };
}
