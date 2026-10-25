import { dayLabel, formatTime, fromLocalInput, jakartaParts } from '@/lib/time';
import type { QuickAccount, QuickCategory, TxType } from './types';

export interface ParsedQuick {
  /** 0 kalau tidak ada nominal yang jelas: tidak boleh disimpan dari ketikan */
  amount: number;
  type: TxType | null;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  /** ISO UTC; null = sekarang */
  occurredAt: string | null;
  /** Label waktu untuk chip, mis. "Kemarin" atau "Sen, 19 Okt 19.30" */
  when: string | null;
  note: string;
  /** 0–1: nominal (0,5), akun (0,25), kategori atau transfer (0,25) */
  confidence: number;
}

export interface ParseContext {
  accounts: QuickAccount[];
  categories: QuickCategory[];
}

const UNIT = String.raw`(?:rb|rbu|ribu|k|jt|juta)`;
const TERM = String.raw`\d+(?:[.,]\d+)*\s*${UNIT}?`;
const AMOUNT_EXPR = new RegExp(String.raw`(?<![\w.,])(${TERM}(?:\s*\+\s*${TERM})*)(?![\w.,])`, 'g');
const WEEKDAYS: [RegExp, number][] = [
  [/\bminggu\b|\bahad\b/, 0],
  [/\bsenin\b/, 1],
  [/\bselasa\b/, 2],
  [/\brabu\b/, 3],
  [/\bkamis\b/, 4],
  [/\bjum'?at\b/, 5],
  [/\bsabtu\b/, 6],
];
const INCOME_WORDS = /\b(gaji|terima|diterima|masuk|dapat|pemasukan|income)\b/;
const TRANSFER_WORDS = /\b(tf|trf|transfer|pindah)\b/;
const FILLER = /\b(pakai|pake|pakek|via|dari|ke|lewat)\b/g;

/** "25rb" → 25000, "1,5jt" → 1500000, "25.000" → 25000, "2.5k" → 2500 */
export function parseAmountTerm(raw: string): number {
  const m = raw.trim().match(/^(\d+(?:[.,]\d+)*)\s*(\w*)$/);
  if (!m) return 0;
  const [, digits, unit] = m as unknown as [string, string, string];
  const parts = digits.split(/[.,]/);
  const last = parts[parts.length - 1]!;
  let n: number;
  if (parts.length === 1) n = Number(digits);
  else if (!unit && parts.slice(1).every((p) => p.length === 3)) n = Number(parts.join(''));
  else if (unit && parts.length > 2) n = Number(parts.join(''));
  else if (unit || last.length !== 3) n = Number(`${parts.slice(0, -1).join('')}.${last}`);
  else n = Number(parts.join(''));
  if (/^(rb|rbu|ribu|k)$/.test(unit)) n *= 1e3;
  if (/^(jt|juta)$/.test(unit)) n *= 1e6;
  return Math.round(n);
}

/** Ekspresi "20rb+5rb" → 25000 */
export function parseAmount(raw: string): number {
  return raw.split('+').reduce((sum, term) => sum + parseAmountTerm(term), 0);
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length]!;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Baca satu baris ketikan bebas jadi isian transaksi. Contoh:
 * "kopi 25rb gopay", "makan siang 35k", "bensin 100rb kemarin",
 * "bca > gopay 99rb", "tf bca gopay 50rb", "+ gaji 5jt bca",
 * "parkir 2rb+3rb senin 19.30". Berjalan di client, tanpa jaringan.
 */
export function parseQuick(text: string, ctx: ParseContext, now: Date = new Date()): ParsedQuick {
  let rest = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  const out: ParsedQuick = {
    amount: 0,
    type: null,
    accountId: null,
    toAccountId: null,
    categoryId: null,
    occurredAt: null,
    when: null,
    note: '',
    confidence: 0,
  };
  const cut = (match: string) => (rest = rest.replace(match, ' '));

  // ---------- waktu ----------
  let hour: number | null = null;
  let minute = 0;
  const clock =
    rest.match(/\b(?:jam|pukul|pkl|pk)\s*(\d{1,2})(?:[.:](\d{2}))?\b/) ??
    rest.match(/(?<![\w.,])(\d{1,2})[.:](\d{2})(?![\w.,])/);
  if (clock && Number(clock[1]) < 24 && Number(clock[2] ?? 0) < 60) {
    hour = Number(clock[1]);
    minute = Number(clock[2] ?? 0);
    cut(clock[0]);
  }

  const today = jakartaParts(now);
  let target: { year: number; month: number; day: number } | null = null;
  const daysAgo = (n: number) => {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day - n));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  };

  const ago = rest.match(/\b(\d{1,2})\s*(?:hari|hr)\s*(?:yang |yg )?lalu\b/);
  const date = rest.match(/\b(?:tgl|tanggal)\s*(\d{1,2})(?:\s*[/-]\s*(\d{1,2}))?\b/);
  if (/\bkemarin lusa\b/.test(rest)) {
    target = daysAgo(2);
    cut('kemarin lusa');
  } else if (/\b(kemarin|kmrn|kmarin|kemaren)\b/.test(rest)) {
    target = daysAgo(1);
    cut(rest.match(/\b(kemarin|kmrn|kmarin|kemaren)\b/)![0]);
  } else if (ago) {
    target = daysAgo(Number(ago[1]));
    cut(ago[0]);
  } else if (/\bhari ini\b/.test(rest)) {
    target = daysAgo(0);
    cut('hari ini');
  } else if (date) {
    const day = Number(date[1]);
    let month = date[2] ? Number(date[2]) : today.month;
    let year = today.year;
    // Tanggal yang belum lewat bulan ini berarti bulan lalu
    if (!date[2] && day > today.day) month -= 1;
    if (date[2] && (month > today.month || (month === today.month && day > today.day))) year -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      target = { year, month, day };
      cut(date[0]);
    }
  } else {
    for (const [re, weekday] of WEEKDAYS) {
      const m = rest.match(re);
      if (!m) continue;
      target = daysAgo((today.weekday - weekday + 7) % 7);
      cut(m[0]);
      break;
    }
  }

  if (target || hour !== null) {
    const day = target ?? daysAgo(0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const h = hour ?? today.hour;
    const min = hour === null ? today.minute : minute;
    out.occurredAt = fromLocalInput(
      `${day.year}-${pad(day.month)}-${pad(day.day)}T${pad(h)}:${pad(min)}`,
    );
    out.when = `${dayLabel(out.occurredAt, now)}${hour !== null ? ` ${formatTime(out.occurredAt)}` : ''}`;
  }

  // ---------- jenis ----------
  const transferMarked = />/.test(rest) || TRANSFER_WORDS.test(rest);
  if (/^\s*\+/.test(rest) || INCOME_WORDS.test(rest)) out.type = 'income';
  rest = rest.replace(/^\s*\+/, ' ');

  // ---------- nominal ----------
  const candidates = [...rest.matchAll(AMOUNT_EXPR)].map((m) => ({
    raw: m[1]!,
    value: parseAmount(m[1]!),
    strong: /[a-z+]/.test(m[1]!) || /\d[.,]\d{3}\b/.test(m[1]!) || parseAmount(m[1]!) >= 100,
  }));
  const chosen =
    candidates.find((c) => c.strong) ??
    candidates.reduce<(typeof candidates)[number] | undefined>(
      (best, c) => (!best || c.value > best.value ? c : best),
      undefined,
    );
  if (chosen && chosen.value > 0) {
    out.amount = chosen.value;
    cut(chosen.raw);
  }

  // ---------- akun ----------
  const aliases = ctx.accounts
    .flatMap((a) => a.aliases.map((alias) => ({ alias: normalize(alias), id: a.id })))
    .filter((a) => a.alias)
    .sort((a, b) => b.alias.length - a.alias.length);
  // Teks dinormalisasi tapi tanda ">" dipertahankan untuk arah transfer
  let norm = ` ${rest.replace(/->/g, '>').replace(/[^a-z0-9>]+/g, ' ')} `;
  const found: { id: string; at: number }[] = [];
  for (const { alias, id } of aliases) {
    if (found.length === 2) break;
    const re = new RegExp(`(?<=[\\s>])${escape(alias)}(?=[\\s>])`);
    const m = norm.match(re);
    if (!m || found.some((f) => f.id === id)) continue;
    found.push({ id, at: m.index! });
    norm = norm.slice(0, m.index) + ' '.repeat(alias.length) + norm.slice(m.index! + alias.length);
  }
  // Salah ketik satu huruf ("gopy", "jagoo") untuk alias satu kata ≥ 4 huruf
  if (!found.length) {
    for (const word of norm.split(/[\s>]+/).filter((w) => w.length >= 4)) {
      const hit = aliases.find(
        (a) => !a.alias.includes(' ') && a.alias.length >= 4 && levenshtein(word, a.alias) <= 1,
      );
      if (!hit) continue;
      found.push({ id: hit.id, at: norm.indexOf(word) });
      norm = norm.replace(new RegExp(`(?<=[\\s>])${escape(word)}(?=[\\s>])`), ' ');
      break;
    }
  }
  found.sort((a, b) => a.at - b.at);
  // "bca ke gopay", "ke gopay dari bca": dua akun dan tepat satu didahului "ke" =
  // transfer, akun setelah "ke" tujuannya
  const afterKe = found.map((f) => /\bke\s*$/.test(norm.slice(0, f.at)));
  const keTarget = found.length === 2 && afterKe[0] !== afterKe[1] ? (afterKe[0] ? 0 : 1) : null;
  if (keTarget !== null) {
    out.type = 'transfer';
    out.accountId = found[1 - keTarget]!.id;
    out.toAccountId = found[keTarget]!.id;
  } else if (transferMarked && found.length === 2) {
    out.type = 'transfer';
    out.accountId = found[0]!.id;
    out.toAccountId = found[1]!.id;
  } else if (found.length) {
    out.accountId = found[0]!.id;
  }

  // ---------- catatan & kategori ----------
  out.note = norm
    .replace(/>/g, ' ')
    .replace(TRANSFER_WORDS, ' ')
    .replace(FILLER, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (out.type === 'income')
    out.note = out.note
      .replace(INCOME_WORDS, (w) => (w === 'gaji' ? w : ' '))
      .replace(/\s+/g, ' ')
      .trim();

  if (out.type !== 'transfer' && out.note) {
    const kind = out.type === 'income' ? 'income' : null;
    const category = ctx.categories.find(
      (c) =>
        (!kind || c.kind === kind) &&
        c.keywords.some((k) => new RegExp(`\\b${escape(k)}`).test(out.note)),
    );
    out.categoryId = category?.id ?? null;
    if (category?.kind === 'income') out.type ??= 'income';
  }

  out.confidence =
    (out.amount ? 0.5 : 0) +
    (out.accountId ? 0.25 : 0) +
    (out.categoryId || out.type === 'transfer' ? 0.25 : 0);
  return out;
}

/** Nama di spec fase 6 */
export const parseQuickAdd = parseQuick;
