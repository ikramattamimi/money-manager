import { addMonths, periodRange } from '@/lib/time';

/*
 * Saldo akun per bulan (redesign R6): saldo per akhir bulan terpilih di daftar
 * akun, tren aset bersih, tab Bulanan dan saldo berjalan di rincian akun.
 * Fungsi murni supaya bisa diuji tanpa Vue. Cara hitung saldo tetap sama:
 * saldo awal + transaksi (transfer keluar termasuk biaya).
 */

export interface MonthRef {
  year: number;
  month: number;
}

export interface MonthPlan {
  /** Bulan terlama dulu, yang terakhir = bulan terpilih */
  months: MonthRef[];
  /** Awal periode tiap bulan + awal periode sesudah bulan terakhir (ISO) */
  cuts: string[];
}

export interface MonthBalance extends MonthRef {
  /** Saldo di awal periode */
  start: number;
  /** Saldo di akhir periode */
  end: number;
  /** Uang masuk / keluar selama periode (termasuk transfer dan koreksi) */
  inflow: number;
  outflow: number;
}

/** `count` bulan sampai (year, month) beserta batas periodenya */
export function monthPlan(year: number, month: number, count: number, startDay = 1): MonthPlan {
  const months: MonthRef[] = [];
  for (let i = count - 1; i >= 0; i--) months.push(addMonths(year, month, -i));
  const cuts = months.map((m) => periodRange(m.year, m.month, startDay).from);
  cuts.push(periodRange(year, month, startDay).to);
  return { months, cuts };
}

export interface BalanceAtLike {
  account_id: string;
  cut: string;
  balance: number;
  inflow: number;
  outflow: number;
}

/** Hasil RPC account_balances_at → bulan per akun (terlama dulu) */
export function fromBalancesAt(
  rows: readonly BalanceAtLike[],
  plan: MonthPlan,
): Map<string, MonthBalance[]> {
  // Batas dari database berformat lain ("+00:00"), jadi dicocokkan lewat waktunya
  const indexOf = new Map(plan.cuts.map((c, i) => [Date.parse(c), i]));
  const byAccount = new Map<string, (BalanceAtLike | undefined)[]>();
  for (const r of rows) {
    const i = indexOf.get(Date.parse(r.cut));
    if (i === undefined) continue;
    const list = byAccount.get(r.account_id) ?? Array<BalanceAtLike | undefined>(plan.cuts.length);
    list[i] = r;
    byAccount.set(r.account_id, list);
  }
  const out = new Map<string, MonthBalance[]>();
  for (const [id, list] of byAccount) {
    const months: MonthBalance[] = [];
    plan.months.forEach((m, k) => {
      const from = list[k];
      const to = list[k + 1];
      if (!from || !to) return;
      months.push({
        ...m,
        start: from.balance,
        end: to.balance,
        inflow: to.inflow,
        outflow: to.outflow,
      });
    });
    out.set(id, months);
  }
  return out;
}

export interface LedgerLikeRow {
  occurred_at: string;
  delta: number;
  balance_after: number;
}

/**
 * Cadangan tanpa RPC: bulan dari riwayat akun (terbaru dulu, dengan saldo
 * berjalan). `complete` = seluruh riwayat termuat; kalau tidak, bulan yang
 * lebih tua dari riwayat termuat bernilai null (tidak diketahui).
 */
export function fromLedger(
  rows: readonly LedgerLikeRow[],
  opening: number,
  complete: boolean,
  plan: MonthPlan,
): (MonthBalance | null)[] {
  const times = rows.map((r) => Date.parse(r.occurred_at));
  const oldest = times.length ? times[times.length - 1]! : Infinity;
  const balanceAt = (cut: number): number | null => {
    const i = times.findIndex((t) => t < cut);
    if (i >= 0) return rows[i]!.balance_after;
    return complete ? opening : null;
  };
  return plan.months.map((m, k) => {
    const from = Date.parse(plan.cuts[k]!);
    const to = Date.parse(plan.cuts[k + 1]!);
    // Riwayat terpotong sebelum awal periode: masuk/keluarnya tidak lengkap
    if (!complete && oldest >= from) return null;
    const start = balanceAt(from);
    const end = balanceAt(to);
    if (start === null || end === null) return null;
    let inflow = 0;
    let outflow = 0;
    rows.forEach((r, i) => {
      if (times[i]! < from || times[i]! >= to) return;
      if (r.delta > 0) inflow += r.delta;
      else outflow -= r.delta;
    });
    return { ...m, start, end, inflow, outflow };
  });
}

export interface TxLike {
  id: string;
  occurred_at: string;
  created_at: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  fee: number;
  account_id: string;
  to_account_id: string | null;
}

/** Efek satu transaksi ke saldo akun `accountId` */
export function deltaFor(t: TxLike, accountId: string): number {
  if (t.type === 'income') return t.account_id === accountId ? t.amount : 0;
  if (t.type === 'expense') return t.account_id === accountId ? -t.amount : 0;
  if (t.account_id === accountId) return -(t.amount + t.fee);
  return t.to_account_id === accountId ? t.amount : 0;
}

/** Urutan riwayat akun: terbaru dulu (sama dengan account_ledger) */
export function newestFirst<T extends TxLike>(list: readonly T[]): T[] {
  return list
    .slice()
    .sort((a, b) =>
      a.occurred_at !== b.occurred_at
        ? a.occurred_at < b.occurred_at
          ? 1
          : -1
        : a.created_at !== b.created_at
          ? a.created_at < b.created_at
            ? 1
            : -1
          : a.id < b.id
            ? 1
            : -1,
    );
}

/** Saldo setelah tiap transaksi, mundur dari saldo akhir periode */
export function runningBalances(
  list: readonly TxLike[],
  accountId: string,
  end: number,
): Map<string, number> {
  const out = new Map<string, number>();
  let balance = end;
  for (const t of newestFirst(list)) {
    out.set(t.id, balance);
    balance -= deltaFor(t, accountId);
  }
  return out;
}
