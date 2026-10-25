import { addMonths, daysInMonth, dayKey } from '@/lib/time';

// Tagihan kartu kredit (fase 11 T3). Tagihan bulan M dicetak di tanggal cetak
// bulan M dan mencakup transaksi sejak sehari setelah cetak bulan sebelumnya.
// Transaksi setelah tanggal cetak masuk ke tagihan bulan berikutnya. Tanggal
// yang tidak ada di bulan pendek jatuh ke hari terakhirnya.

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const clampDay = (y: number, m: number, day: number) =>
  Math.min(Math.max(day, 1), daysInMonth(y, m));

function nextDay(key: string) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export interface Cycle {
  /** Bulan cetak tagihan */
  year: number;
  month: number;
  /** Tanggal pertama periode, "YYYY-MM-DD" */
  start: string;
  /** Tanggal cetak (inklusif) */
  end: string;
  /** Jatuh tempo pembayaran */
  due: string;
}

/** Periode tagihan yang dicetak di bulan (year, month) */
export function statementCycle(
  year: number,
  month: number,
  statementDay: number,
  dueDay: number,
): Cycle {
  const prev = addMonths(year, month, -1);
  const end = ymd(year, month, clampDay(year, month, statementDay));
  const start = nextDay(ymd(prev.year, prev.month, clampDay(prev.year, prev.month, statementDay)));
  // Jatuh tempo setelah tanggal cetak: bulan yang sama kalau harinya lebih besar, kalau tidak bulan depan
  const dueMonth = dueDay > statementDay ? { year, month } : addMonths(year, month, 1);
  const due = ymd(dueMonth.year, dueMonth.month, clampDay(dueMonth.year, dueMonth.month, dueDay));
  return { year, month, start, end, due };
}

/** Bulan tagihan yang akan memuat transaksi di tanggal `key` */
export function cycleOf(key: string, statementDay: number): { year: number; month: number } {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return d <= clampDay(y, m, statementDay) ? { year: y, month: m } : addMonths(y, m, 1);
}

export interface LedgerLike {
  occurred_at: string;
  /** Efek ke saldo akun; belanja negatif, pembayaran positif */
  delta: number;
}

export interface CardBill {
  /** Periode berjalan (belum dicetak) */
  current: Cycle;
  currentCharges: number;
  /** Tagihan terakhir yang sudah dicetak */
  last: Cycle;
  /** Utang saat tagihan dicetak */
  owed: number;
  /** Pembayaran sejak tagihan dicetak */
  paid: number;
  remaining: number;
  status: 'paid' | 'open' | 'overdue' | 'none';
}

/**
 * Ringkasan tagihan dari riwayat akun. `balance` = saldo akun sekarang
 * (kartu kredit negatif = utang). Saldo saat cetak dihitung mundur dari saldo
 * sekarang, jadi riwayat yang dimuat cukup sejak tanggal cetak terakhir.
 */
export function cardBill(
  rows: LedgerLike[],
  balance: number,
  today: string,
  statementDay: number,
  dueDay: number,
): CardBill {
  const open = cycleOf(today, statementDay);
  const current = statementCycle(open.year, open.month, statementDay, dueDay);
  const prev = addMonths(open.year, open.month, -1);
  const last = statementCycle(prev.year, prev.month, statementDay, dueDay);

  let afterCut = 0;
  let paid = 0;
  let currentCharges = 0;
  for (const r of rows) {
    const day = dayKey(r.occurred_at);
    if (day <= last.end) continue;
    afterCut += r.delta;
    if (r.delta > 0) paid += r.delta;
    else if (day >= current.start) currentCharges += -r.delta;
  }
  const owed = Math.max(0, -(balance - afterCut));
  const remaining = Math.max(0, owed - paid);
  const status =
    owed === 0 ? 'none' : remaining === 0 ? 'paid' : today > last.due ? 'overdue' : 'open';
  return { current, currentCharges, last, owed, paid: Math.min(paid, owed), remaining, status };
}
