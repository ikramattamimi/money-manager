import type { ReconciledRow, StatementRow } from '#shared/types/bank';
import { sha256 } from './hash';

/** Transaksi di buku yang menyentuh akun yang sedang dicocokkan */
export interface ExistingTx {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  /** ISO timestamptz */
  occurredAt: string;
  amount: number;
  fee: number;
  accountId: string;
  toAccountId: string | null;
  dedupeKey: string | null;
}

export interface ReconcileInput {
  rows: StatementRow[];
  /** Akun di buku yang mewakili rekening di file */
  accountId: string;
  /** Nama pemilik rekening di file, untuk mengenali transfer ke diri sendiri */
  holder: string;
  accounts: { id: string; name: string }[];
  existing: ExistingTx[];
}

/** Selisih maksimal tanggal mutasi dan tanggal catatan */
const MAX_DAYS = 2;
const DAY_MS = 86_400_000;

/** Tanggal WIB "YYYY-MM-DD" dari ISO timestamptz */
const wibDate = (iso: string) =>
  new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
const wibMinutes = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / DAY_MS);

/** "BUDI S. SANTOSO" → "budissantoso": huruf dan angka saja */
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Waktu transaksi baru: jam dari bank, atau tengah hari kalau tidak ada */
export const occurredAtOf = (r: StatementRow) => `${r.date}T${r.time ?? '12:00'}:00+07:00`;

/** Catatan untuk transaksi baru: nama pihak lawan, kecuali yang generik */
export function noteFor(r: StatementRow): string {
  if (/^(Transaksi GoPay|Gopay Savings)/i.test(r.counterparty)) {
    const extra = r.description.split(' · ').slice(1).join(' ');
    return extra && !/^(Jago payment|GoPay Bank Transfer)$/i.test(extra) ? extra : 'GoPay';
  }
  if (/Pindah uang antar Kantong/i.test(r.counterparty))
    return r.counterparty.replace(/\s*Pindah uang antar Kantong.*/i, '').trim();
  return r.counterparty || r.description;
}

/** Apakah transaksi lama mengubah saldo akun ke arah yang sama dengan mutasi */
function affects(t: ExistingTx, accountId: string, direction: 'in' | 'out') {
  if (direction === 'out')
    return (t.type === 'expense' || t.type === 'transfer') && t.accountId === accountId;
  return (
    (t.type === 'income' && t.accountId === accountId) ||
    (t.type === 'transfer' && t.toAccountId === accountId)
  );
}

/** Nominal yang tampil di mutasi: transfer keluar bisa termasuk biaya */
const amountsOf = (t: ExistingTx, direction: 'in' | 'out') =>
  direction === 'out' && t.type === 'transfer' && t.fee > 0
    ? [t.amount, t.amount + t.fee]
    : [t.amount];

/**
 * Cocokkan mutasi dengan transaksi di buku. Satu transaksi hanya dipakai untuk
 * satu baris mutasi. Kandidat = akun sama, arah sama, nominal sama, tanggal ±2
 * hari. Kandidat terdekat menang; kalau dua kandidat sama dekatnya di tanggal
 * yang berbeda, baris ditandai ragu dan dibiarkan untuk diputuskan user.
 */
export async function reconcile(input: ReconcileInput): Promise<ReconciledRow[]> {
  const { rows, accountId, existing } = input;
  const used = new Set<string>();
  const keys = await dedupeKeys(rows, accountId);
  const byKey = new Map(existing.filter((t) => t.dedupeKey).map((t) => [t.dedupeKey!, t]));

  // Pasangan paling pasti diproses dulu: mutasi yang pernah diimpor, lalu yang selisihnya kecil
  const result: ReconciledRow[] = rows.map((r, i) => ({
    ...r,
    status: 'baru',
    matchIds: [],
    counterAccountId: null,
    note: noteFor(r),
    dedupeKey: keys[i]!,
    suggestion: null,
  }));

  for (const row of result) {
    const same = byKey.get(row.dedupeKey);
    if (same) {
      used.add(same.id);
      row.status = 'tercatat';
      row.matchIds = [same.id];
    }
  }

  const distance = (r: StatementRow, t: ExistingTx) => {
    const days = Math.abs(dayDiff(r.date, wibDate(t.occurredAt)));
    const minutes = r.time
      ? Math.abs(
          Number(r.time.slice(0, 2)) * 60 + Number(r.time.slice(3)) - wibMinutes(t.occurredAt),
        )
      : 0;
    return days * 1440 + (days === 0 ? minutes : 0);
  };
  const candidatesOf = (r: ReconciledRow) =>
    existing
      .filter(
        (t) =>
          !used.has(t.id) &&
          affects(t, accountId, r.direction) &&
          amountsOf(t, r.direction).includes(r.amount) &&
          Math.abs(dayDiff(r.date, wibDate(t.occurredAt))) <= MAX_DAYS,
      )
      .sort((a, b) => distance(r, a) - distance(r, b));

  const pending = result
    .filter((r) => r.status === 'baru')
    .map((r) => ({ r, best: candidatesOf(r)[0] }))
    .filter((p) => p.best)
    .sort((a, b) => distance(a.r, a.best!) - distance(b.r, b.best!));

  for (const { r } of pending) {
    const candidates = candidatesOf(r);
    const [best, second] = candidates;
    if (!best) continue;
    const tie =
      second &&
      distance(r, second) === distance(r, best) &&
      wibDate(second.occurredAt) !== wibDate(best.occurredAt);
    if (tie) {
      r.status = 'ragu';
      r.matchIds = candidates.filter((t) => distance(r, t) === distance(r, best)).map((t) => t.id);
      continue;
    }
    used.add(best.id);
    r.status = 'tercatat';
    r.matchIds = [best.id];
  }

  for (const r of result) if (r.status === 'baru') markTransfer(r, input);
  return result;
}

/**
 * Transfer antar-akun sendiri: pindah kantong Jago (nama kantong = akun),
 * nama pemilik rekening muncul di keterangan, atau pihak lawan adalah nama
 * akun di buku dengan keterangan transfer/top up.
 */
function markTransfer(r: ReconciledRow, { accountId, holder, accounts }: ReconcileInput) {
  const text = `${r.counterparty} ${r.description}`;
  const others = accounts.filter((a) => a.id !== accountId && squash(a.name).length >= 3);
  const textWords = new Set(words(text));
  // Akun yang namanya muncul utuh sebagai kata (atau rangkaian kata) di keterangan
  const named = others.filter((a) => {
    const w = words(a.name);
    return w.length > 0 && w.every((x) => textWords.has(x));
  });
  const pick = () => (named.length === 1 ? named[0]!.id : null);

  const pocket = /Pindah uang antar Kantong/i.test(text);
  const toSelf = squash(holder).length >= 6 && squash(text).includes(squash(holder));
  const transferWord = /\b(transfer|top ?up|pindah)\b/i.test(r.description);
  const counterpartyIsAccount = others.some((a) => squash(a.name) === squash(r.counterparty));

  if (pocket || toSelf || (counterpartyIsAccount && transferWord)) {
    r.status = 'transfer';
    r.counterAccountId = pocket ? (pocketAccount(others, r.note) ?? pick()) : pick();
  }
}

/** Akun untuk nama kantong: sama persis, atau satu-satunya yang berakhiran nama itu ("Jago - Dana Darurat") */
function pocketAccount(accounts: { id: string; name: string }[], pocket: string) {
  const name = squash(pocket);
  if (name.length < 3) return null;
  const exact = accounts.find((a) => squash(a.name) === name);
  if (exact) return exact.id;
  const ending = accounts.filter((a) => squash(a.name).endsWith(name));
  return ending.length === 1 ? ending[0]!.id : null;
}

/**
 * Kunci duplikat per baris mutasi: akun + tanggal + jam + arah + nominal +
 * saldo, ditambah nomor urut kalau ada baris kembar persis.
 */
async function dedupeKeys(rows: StatementRow[], accountId: string) {
  const seen = new Map<string, number>();
  return Promise.all(
    rows.map((r) => {
      const base = [accountId, r.date, r.time ?? '', r.direction, r.amount, r.balance ?? ''].join(
        '|',
      );
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return sha256(n > 1 ? `${base}#${n}` : base).then((h) => `bk:${h}`);
    }),
  );
}
