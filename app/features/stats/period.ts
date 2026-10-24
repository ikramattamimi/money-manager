import { fromLocalInput, jakartaParts, MONTHS_LONG, MONTHS_SHORT } from '@/lib/time';

export type PeriodKind = 'week' | 'month' | 'year' | 'range';

/** Periode statistik. Tanggal "YYYY-MM-DD" menurut kalender WIB. */
export interface Period {
  kind: PeriodKind;
  /** Tanggal di dalam periode (minggu/bulan/tahun) */
  anchor: string;
  /** Rentang pilihan, inklusif (kind = range) */
  from?: string;
  to?: string;
}

export interface PeriodBounds {
  /** ISO UTC, [from, to) */
  from: string;
  to: string;
  label: string;
  /** Bulan terakhir periode, untuk ujung grafik tren */
  endYear: number;
  endMonth: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
};
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
};
const startOf = (s: string) => fromLocalInput(`${s}T00:00`);

/** Hari ini menurut WIB, "YYYY-MM-DD" */
export function todayWib(now: Date = new Date()): string {
  const p = jakartaParts(now);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function short(s: string, withYear: boolean) {
  const d = parse(s);
  const base = `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
  return withYear ? `${base} ${d.getUTCFullYear()}` : base;
}

export function periodBounds(p: Period): PeriodBounds {
  const a = parse(p.anchor);
  const year = a.getUTCFullYear();
  const month = a.getUTCMonth() + 1;
  switch (p.kind) {
    case 'week': {
      // Minggu dimulai Senin
      const monday = addDays(p.anchor, -((a.getUTCDay() + 6) % 7));
      const sunday = addDays(monday, 6);
      const sameYear = monday.slice(0, 4) === sunday.slice(0, 4);
      const end = parse(sunday);
      return {
        from: startOf(monday),
        to: startOf(addDays(sunday, 1)),
        label: `${short(monday, !sameYear)} – ${short(sunday, true)}`,
        endYear: end.getUTCFullYear(),
        endMonth: end.getUTCMonth() + 1,
      };
    }
    case 'year':
      return {
        from: startOf(`${year}-01-01`),
        to: startOf(`${year + 1}-01-01`),
        label: String(year),
        endYear: year,
        endMonth: 12,
      };
    case 'range': {
      const from = p.from ?? p.anchor;
      const to = p.to && p.to >= from ? p.to : from;
      const end = parse(to);
      return {
        from: startOf(from),
        to: startOf(addDays(to, 1)),
        label: `${short(from, from.slice(0, 4) !== to.slice(0, 4))} – ${short(to, true)}`,
        endYear: end.getUTCFullYear(),
        endMonth: end.getUTCMonth() + 1,
      };
    }
    default: {
      const next = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
      return {
        from: startOf(`${year}-${pad(month)}-01`),
        to: startOf(next),
        label: `${MONTHS_LONG[month - 1]} ${year}`,
        endYear: year,
        endMonth: month,
      };
    }
  }
}

/** Geser ke periode sebelum (-1) / sesudah (+1). Rentang digeser sepanjang dirinya. */
export function shiftPeriod(p: Period, delta: number): Period {
  const a = parse(p.anchor);
  switch (p.kind) {
    case 'week':
      return { ...p, anchor: addDays(p.anchor, 7 * delta) };
    case 'year':
      return { ...p, anchor: `${a.getUTCFullYear() + delta}-01-01` };
    case 'range': {
      const from = p.from ?? p.anchor;
      const to = p.to ?? from;
      const length = Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000) + 1;
      return { ...p, from: addDays(from, length * delta), to: addDays(to, length * delta) };
    }
    default: {
      const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + delta, 1));
      return { ...p, anchor: ymd(d) };
    }
  }
}

/** Periode berikutnya sudah dimulai? (tombol › nonaktif kalau belum) */
export function hasNext(p: Period, now: Date = new Date()): boolean {
  return periodBounds(shiftPeriod(p, 1)).from <= startOf(todayWib(now));
}
