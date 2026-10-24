import { z } from 'zod';
import type {
  AccountKind,
  ImportAccount,
  ImportCategory,
  ImportError,
  ImportTransaction,
  ParsedImport,
} from '#shared/types/import';

/** Judul kolom ekspor Realbyte Money Manager (iOS), urut */
export const REALBYTE_HEADER = [
  'Period',
  'Accounts',
  'Category',
  'Subcategory',
  'Note',
  'IDR',
  'Income/Expense',
  'Description',
  'Amount',
  'Currency',
  'Accounts',
] as const;

export const MAX_ROWS = 20_000;

const KIND_VALUES = [
  'Exp.',
  'Income',
  'Transfer-Out',
  'Transfer-In',
  'Expense Balance',
  'Income Balance',
] as const;

const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v == null ? '' : String(v).trim()));

const rowSchema = z.object({
  period: z.number({ error: 'Kolom Period bukan tanggal' }).positive('Kolom Period bukan tanggal'),
  account: text.pipe(z.string().min(1, 'Akun kosong')),
  category: text,
  subcategory: text,
  note: text,
  amount: z
    .number({ error: 'Nominal bukan angka' })
    .transform((v) => Math.round(Math.abs(v)))
    .pipe(z.number().positive('Nominal 0')),
  kind: z.enum(KIND_VALUES, { error: 'Jenis transaksi tidak dikenal' }),
  description: text,
});
type Row = z.infer<typeof rowSchema> & { row: number };

/** Cek judul kolom: tolak file yang bukan ekspor Realbyte */
export function isRealbyteHeader(header: unknown[]): boolean {
  return REALBYTE_HEADER.every((name, i) => String(header[i] ?? '').trim() === name);
}

/**
 * Serial Excel (hari sejak 30 Des 1899, dengan pecahan = jam) berisi waktu
 * lokal WIB tanpa zona. Dibulatkan ke detik, lalu digeser −7 jam ke UTC.
 */
export function serialToIso(serial: number): string {
  const seconds = Math.round(serial * 86_400);
  const wallClock = Date.UTC(1899, 11, 30) + seconds * 1000;
  return new Date(wallClock - 7 * 3_600_000).toISOString();
}

const EMOJI_PREFIX =
  /^((?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|‍|️|⃣)+)\s*/u;

/** "🥘 Food" → { emoji: "🥘", name: "Food" }; spasi di ujung dibuang */
export function splitEmoji(raw: string): { emoji: string; name: string } {
  const value = raw.trim();
  const match = value.match(EMOJI_PREFIX);
  if (!match || !/\p{Extended_Pictographic}/u.test(match[1]!)) return { emoji: '', name: value };
  const name = value.slice(match[0].length).trim();
  return name ? { emoji: match[1]!, name } : { emoji: '', name: value };
}

/** Grup akun tidak ada di ekspor, jadi ditebak dari nama. Bisa diubah di preview. */
export function guessAccountKind(name: string): AccountKind {
  const n = name.trim().toLowerCase();
  if (/^cash\b/.test(n) || n === 'tunai') return 'cash';
  if (/^(bca|bbca|seabank|jago\b|bri\b|bni\b|mandiri\b|blu\b)/.test(n)) return 'bank';
  if (/^(gopay|dana|spay|shopeepay|ovo)/.test(n)) return 'ewallet';
  if (/^(bibit\b|rdn\b|stockbit|ajaib|pluang)/.test(n)) return 'investment';
  if (/^(loan|utang|hutang|paylater|kredivo)/.test(n)) return 'loan';
  if (/^(spotify\b|piutang)/.test(n)) return 'receivable';
  // Sisanya (nama orang, amplop) tidak bisa ditebak dengan aman: pilih di preview
  return 'other';
}

const ICON_RULES: [RegExp, string][] = [
  [/snack|jajan|cemil/, 'cookie'],
  [/coffee|kopi/, 'coffee'],
  [/food|makan|main course|goib|resto/, 'utensils'],
  [/fuel|bensin|bbm/, 'fuel'],
  [/parkir|parking/, 'square-parking'],
  [/moto|motor|car\b|mobil|servis/, 'car'],
  [/ojek|taxi|grab|gojek/, 'car-taxi-front'],
  [/shopping|belanja/, 'shopping-bag'],
  [/health|sehat|obat|dokter/, 'heart-pulse'],
  [/family|keluarga/, 'users'],
  [/friend|teman/, 'smile'],
  [/gf\b|pacar|love|nikah/, 'hand-heart'],
  [/charity|sedekah|zakat|donasi/, 'hand-heart'],
  [/gift|hadiah/, 'gift'],
  [/cigarette|rokok/, 'cigarette'],
  [/spotify|music|musik/, 'music'],
  [/subscri|langganan|netflix/, 'smartphone'],
  [/entertain|hiburan|movie|film/, 'clapperboard'],
  [/college|kuliah|school|sekolah/, 'graduation-cap'],
  [/upskill|course|kursus|buku|book/, 'book'],
  [/laundry|cuci/, 'shirt'],
  [/rent|kos|sewa|house|rumah/, 'house'],
  [/salary|gaji|work|kerja|project/, 'briefcase'],
  [/bonus|award/, 'award'],
  [/interest|bunga|divid|invest|uniera|saham/, 'trending-up'],
  [/receivable|piutang|return|allowance|uang saku/, 'coins'],
  [/nabung|saving|tabung/, 'piggy-bank'],
  [/admin|fee|biaya/, 'receipt'],
  [/personal|pribadi/, 'smile'],
];

export function guessCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  return ICON_RULES.find(([re]) => re.test(n))?.[1] ?? 'tag';
}

const TONES = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .slice(0, 20)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const lower = (s: string) => s.trim().toLowerCase();

/**
 * Baca baris ekspor Realbyte (array of array, baris 0 = judul kolom).
 * Pasangan Transfer-Out + Transfer-In digabung jadi satu transaksi transfer.
 */
export async function parseRealbyte(rows: unknown[][]): Promise<ParsedImport> {
  const errors: ImportError[] = [];
  const valid: Row[] = [];

  rows.slice(1).forEach((raw, i) => {
    const row = i + 1;
    if (!raw || raw.every((cell) => cell == null || cell === '')) return;
    const result = rowSchema.safeParse({
      period: raw[0],
      account: raw[1],
      category: raw[2],
      subcategory: raw[3],
      note: raw[4],
      // Kolom IDR; kalau kosong pakai Amount
      amount: raw[5] ?? raw[8],
      kind: typeof raw[6] === 'string' ? raw[6].trim() : raw[6],
      description: raw[7],
    });
    if (result.success) valid.push({ ...result.data, row });
    else errors.push({ row, reason: result.error.issues[0]?.message ?? 'Baris tidak valid' });
  });

  const accounts = new Map<string, ImportAccount>();
  const touchAccount = (name: string) => {
    const key = lower(name);
    const found = accounts.get(key);
    if (found) found.count++;
    else accounts.set(key, { name: name.trim(), kind: guessAccountKind(name), count: 1 });
  };

  const categories = new Map<string, ImportCategory>();
  let parentIndex = 0;
  function touchCategory(kind: 'income' | 'expense', rawParent: string, rawChild: string) {
    const parent = splitEmoji(rawParent);
    const parentKey = `${kind}:${lower(parent.name)}`;
    let p = categories.get(parentKey);
    if (!p) {
      p = {
        key: parentKey,
        kind,
        name: parent.name,
        emoji: parent.emoji,
        icon: guessCategoryIcon(parent.name),
        tone: TONES[parentIndex++ % TONES.length]!,
        parentKey: null,
        count: 0,
      };
      categories.set(parentKey, p);
    }
    p.count++;
    if (!rawChild) return parentKey;

    const child = splitEmoji(rawChild);
    const childKey = `${parentKey}/${lower(child.name)}`;
    const c = categories.get(childKey);
    if (c) c.count++;
    else
      categories.set(childKey, {
        key: childKey,
        kind,
        name: child.name,
        emoji: child.emoji,
        icon: guessCategoryIcon(child.name),
        tone: p.tone,
        parentKey,
        count: 1,
      });
    return childKey;
  }

  const transactions: ImportTransaction[] = [];
  const push = (r: Row, tx: Omit<ImportTransaction, 'row' | 'occurredAt' | 'dedupeKey'>) =>
    transactions.push({ ...tx, row: r.row, occurredAt: serialToIso(r.period), dedupeKey: '' });

  // Transfer-In dipasangkan dengan Transfer-Out: waktu, nominal sama, akun dibalik
  const pendingIn = new Map<string, Row[]>();
  const pairKey = (seconds: number, amount: number, from: string, to: string) =>
    `${seconds}|${amount}|${lower(from)}|${lower(to)}`;
  for (const r of valid) {
    if (r.kind !== 'Transfer-In') continue;
    const key = pairKey(Math.round(r.period * 86_400), r.amount, r.category, r.account);
    pendingIn.set(key, [...(pendingIn.get(key) ?? []), r]);
  }

  let unpairedTransfers = 0;
  for (const r of valid) {
    switch (r.kind) {
      case 'Exp.':
      case 'Income': {
        const kind = r.kind === 'Exp.' ? 'expense' : 'income';
        const adjustment = lower(r.category) === 'modified bal.';
        touchAccount(r.account);
        push(r, {
          type: kind,
          amount: r.amount,
          account: r.account,
          toAccount: null,
          category:
            adjustment || !r.category ? null : touchCategory(kind, r.category, r.subcategory),
          note: adjustment ? 'Koreksi saldo' : r.note,
          description: r.description,
          isAdjustment: adjustment,
        });
        break;
      }
      case 'Expense Balance':
      case 'Income Balance':
        touchAccount(r.account);
        push(r, {
          type: r.kind === 'Expense Balance' ? 'expense' : 'income',
          amount: r.amount,
          account: r.account,
          toAccount: null,
          category: null,
          note: 'Koreksi saldo',
          description: r.description,
          isAdjustment: true,
        });
        break;
      case 'Transfer-Out': {
        if (!r.category) {
          errors.push({ row: r.row, reason: 'Transfer tanpa akun tujuan' });
          break;
        }
        const key = pairKey(Math.round(r.period * 86_400), r.amount, r.account, r.category);
        const partners = pendingIn.get(key);
        if (partners?.length) partners.shift();
        else unpairedTransfers++;
        addTransfer(r, r.account, r.category);
        break;
      }
      case 'Transfer-In':
        break;
    }
  }
  // Transfer-In yang tidak punya pasangan Transfer-Out tetap jadi transfer
  for (const rest of pendingIn.values())
    for (const r of rest) {
      if (!r.category) {
        errors.push({ row: r.row, reason: 'Transfer tanpa akun asal' });
        continue;
      }
      unpairedTransfers++;
      addTransfer(r, r.category, r.account);
    }

  function addTransfer(r: Row, from: string, to: string) {
    if (lower(from) === lower(to)) {
      errors.push({ row: r.row, reason: 'Transfer ke akun yang sama' });
      return;
    }
    touchAccount(from);
    touchAccount(to);
    push(r, {
      type: 'transfer',
      amount: r.amount,
      account: from,
      toAccount: to,
      category: null,
      note: r.note,
      description: r.description,
      isAdjustment: false,
    });
  }

  // Kunci anti-dobel. Baris identik di file yang sama diberi nomor urut supaya
  // tetap masuk semua, dan impor ulang menghasilkan kunci yang sama.
  transactions.sort((a, b) => a.row - b.row);
  const seen = new Map<string, number>();
  for (const t of transactions) {
    const base = [
      t.occurredAt,
      t.amount,
      t.isAdjustment ? `${t.type}-adj` : t.type,
      lower(t.account),
      lower(t.toAccount ?? ''),
      lower(t.note),
    ].join('|');
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    t.dedupeKey = `rb:${await sha256(n > 1 ? `${base}#${n}` : base)}`;
  }

  return {
    transactions,
    accounts: [...accounts.values()],
    categories: [...categories.values()],
    errors: errors.sort((a, b) => a.row - b.row),
    unpairedTransfers,
  };
}
