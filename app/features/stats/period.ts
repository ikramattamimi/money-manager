import {
  addMonths,
  fromLocalInput,
  jakartaParts,
  MONTHS_LONG,
  MONTHS_SHORT,
  periodOf,
  periodRange,
  periodRangeLabel,
  periodStartDate,
} from '@/lib/time';

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
  /** Rentang tanggal periode bulan kalau awal bulan bukan tanggal 1 ("25 Okt – 24 Nov") */
  range?: string;
  /** Periode bulan terakhir, untuk ujung grafik tren dan budget */
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

/**
 * Batas periode. `startDay` = tanggal awal bulan buku: periode bulan dan tahun
 * mengikutinya, minggu dan rentang tidak (tapi periode bulan ujungnya ikut).
 */
export function periodBounds(p: Period, startDay = 1): PeriodBounds {
  const a = parse(p.anchor);
  const { year, month } = periodOf(p.anchor, startDay);
  const endOf = (last: string) => {
    const e = periodOf(last, startDay);
    return { endYear: e.year, endMonth: e.month };
  };
  switch (p.kind) {
    case 'week': {
      // Minggu dimulai Senin
      const monday = addDays(p.anchor, -((a.getUTCDay() + 6) % 7));
      const sunday = addDays(monday, 6);
      const sameYear = monday.slice(0, 4) === sunday.slice(0, 4);
      return {
        from: startOf(monday),
        to: startOf(addDays(sunday, 1)),
        label: `${short(monday, !sameYear)} – ${short(sunday, true)}`,
        ...endOf(sunday),
      };
    }
    case 'year': {
      // Tahun = periode Januari s.d. Desember tahun itu
      const y = Number(p.anchor.slice(0, 4));
      return {
        from: periodRange(y, 1, startDay).from,
        to: periodRange(y + 1, 1, startDay).from,
        label: String(y),
        endYear: y,
        endMonth: 12,
      };
    }
    case 'range': {
      const from = p.from ?? p.anchor;
      const to = p.to && p.to >= from ? p.to : from;
      return {
        from: startOf(from),
        to: startOf(addDays(to, 1)),
        label: `${short(from, from.slice(0, 4) !== to.slice(0, 4))} – ${short(to, true)}`,
        ...endOf(to),
      };
    }
    default: {
      const range = periodRangeLabel(year, month, startDay);
      return {
        ...periodRange(year, month, startDay),
        label: `${MONTHS_LONG[month - 1]} ${year}`,
        ...(range ? { range } : {}),
        endYear: year,
        endMonth: month,
      };
    }
  }
}

/** Geser ke periode sebelum (-1) / sesudah (+1). Rentang digeser sepanjang dirinya. */
export function shiftPeriod(p: Period, delta: number, startDay = 1): Period {
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
      // Jangkar = tanggal mulai periode tujuan, jadi tidak tergelincir ke periode lain
      const { year, month } = periodOf(p.anchor, startDay);
      const n = addMonths(year, month, delta);
      return { ...p, anchor: periodStartDate(n.year, n.month, startDay) };
    }
  }
}

/** Periode berikutnya sudah dimulai? (tombol › nonaktif kalau belum) */
export function hasNext(p: Period, now: Date = new Date(), startDay = 1): boolean {
  return periodBounds(shiftPeriod(p, 1, startDay), startDay).from <= startOf(todayWib(now));
}
