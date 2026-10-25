// Semua tanggal dihitung di zona Asia/Jakarta (WIB, UTC+7, tanpa DST),
// berapa pun zona perangkat. Database menyimpan timestamptz (UTC).

const OFFSET_MS = 7 * 60 * 60 * 1000;
const OFFSET = '+07:00';

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
export const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
export const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export interface JakartaParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Minggu */
  weekday: number;
}

/** Komponen tanggal sebuah waktu menurut jam WIB */
export function jakartaParts(value: string | Date): JakartaParts {
  const shifted = new Date(new Date(value).getTime() + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// ---------------------------------------------------------------------
// Periode bulan. Buku bisa memilih tanggal awal bulan (1–31): periode
// "Oktober" dengan awal 25 = 25 Okt – 24 Nov. Bulan yang lebih pendek dari
// tanggal awal mulai di hari terakhirnya. Aturan yang sama ada di SQL
// (private.period_start / private.period_key).
// ---------------------------------------------------------------------

/** Tanggal mulai periode (year, month), "YYYY-MM-DD" WIB */
export function periodStartDate(year: number, month: number, startDay = 1): string {
  const day = Math.min(Math.max(startDay, 1), daysInMonth(year, month));
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Rentang satu periode bulan sebagai ISO UTC: [from, to) */
export function periodRange(
  year: number,
  month: number,
  startDay = 1,
): { from: string; to: string } {
  const next = addMonths(year, month, 1);
  return {
    from: new Date(`${periodStartDate(year, month, startDay)}T00:00:00${OFFSET}`).toISOString(),
    to: new Date(
      `${periodStartDate(next.year, next.month, startDay)}T00:00:00${OFFSET}`,
    ).toISOString(),
  };
}

/** Periode tempat sebuah waktu (atau tanggal "YYYY-MM-DD") jatuh */
export function periodOf(value: string | Date, startDay = 1): { year: number; month: number } {
  const p =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? (() => {
          const [year, month, day] = value.split('-').map(Number) as [number, number, number];
          return { year, month, day };
        })()
      : jakartaParts(value);
  const start = Number(periodStartDate(p.year, p.month, startDay).slice(8));
  return p.day >= start ? { year: p.year, month: p.month } : addMonths(p.year, p.month, -1);
}

/** Semua tanggal "YYYY-MM-DD" dalam periode, urut */
export function periodDays(year: number, month: number, startDay = 1): string[] {
  const next = addMonths(year, month, 1);
  const end = periodStartDate(next.year, next.month, startDay);
  const days: string[] = [];
  const d = new Date(`${periodStartDate(year, month, startDay)}T00:00:00Z`);
  for (let key = d.toISOString().slice(0, 10); key < end; key = d.toISOString().slice(0, 10)) {
    days.push(key);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

/** "25 Okt – 24 Nov"; kosong kalau periode = bulan kalender (awal tanggal 1) */
export function periodRangeLabel(year: number, month: number, startDay = 1): string {
  if (startDay <= 1) return '';
  const days = periodDays(year, month, startDay);
  const short = (s: string) => `${Number(s.slice(8))} ${MONTHS_SHORT[Number(s.slice(5, 7)) - 1]}`;
  return `${short(days[0]!)} – ${short(days[days.length - 1]!)}`;
}

/** Hari pertama bulan, indeks kolom kalender yang dimulai Senin (0 = Senin) */
export function firstWeekdayMondayBased(year: number, month: number): number {
  return (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Nilai untuk <input type="datetime-local"> dalam jam WIB */
export function toLocalInput(value: string | Date): string {
  const p = jakartaParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Kebalikan toLocalInput: "2026-10-24T14:05" (WIB) -> ISO UTC */
export function fromLocalInput(value: string): string {
  return new Date(`${value}:00${OFFSET}`).toISOString();
}

export function formatTime(value: string | Date): string {
  const p = jakartaParts(value);
  return `${pad(p.hour)}.${pad(p.minute)}`;
}

/** Label grup harian: "Hari ini", "Kemarin", atau "Sab, 18 Okt" */
export function dayLabel(value: string | Date, now: Date = new Date()): string {
  const p = jakartaParts(value);
  const today = jakartaParts(now);
  const yesterday = jakartaParts(new Date(now.getTime() - 86_400_000));
  const same = (a: JakartaParts, b: JakartaParts) =>
    a.year === b.year && a.month === b.month && a.day === b.day;
  if (same(p, today)) return 'Hari ini';
  if (same(p, yesterday)) return 'Kemarin';
  return `${DAYS_SHORT[p.weekday]}, ${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** Kunci hari "YYYY-MM-DD" (WIB) untuk pengelompokan */
export function dayKey(value: string | Date): string {
  const p = jakartaParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
