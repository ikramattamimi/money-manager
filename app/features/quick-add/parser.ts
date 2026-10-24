import type { DraftDate, QuickAccount, QuickCategory, TxType } from './types';

export interface ParsedQuick {
  amount: number;
  type: TxType | null;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  date: DraftDate | null;
  note: string;
}

/**
 * Baca satu baris ketikan bebas: "kopi 25rb gopay", "bca > gopay 99rb",
 * "+ gaji 5jt bca", "bensin 100rb kemarin". Versi prototipe; fase 6 T1
 * memperluasnya (ekspresi, hari, jam) dan menambah tes.
 */
export function parseQuick(
  text: string,
  ctx: { accounts: QuickAccount[]; categories: QuickCategory[] },
): ParsedQuick {
  let rest = ` ${text.toLowerCase()} `;
  const out: ParsedQuick = {
    amount: 0,
    type: null,
    accountId: null,
    toAccountId: null,
    categoryId: null,
    date: null,
    note: '',
  };

  const amount = rest.match(/(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta)?(?=\s)/);
  if (amount) {
    let n = parseFloat(amount[1]!.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    if (/^(rb|ribu|k)$/.test(amount[2] ?? '')) n *= 1e3;
    if (/^(jt|juta)$/.test(amount[2] ?? '')) n *= 1e6;
    out.amount = Math.round(n);
    rest = rest.replace(amount[0], ' ');
  }

  const aliasToId = new Map<string, string>();
  for (const account of ctx.accounts)
    for (const alias of account.aliases) aliasToId.set(alias, account.id);

  const transfer = rest.match(/\b(\w+)\s*>\s*(\w+)\b/);
  if (transfer && aliasToId.has(transfer[1]!) && aliasToId.has(transfer[2]!)) {
    out.type = 'transfer';
    out.accountId = aliasToId.get(transfer[1]!)!;
    out.toAccountId = aliasToId.get(transfer[2]!)!;
    rest = rest.replace(transfer[0], ' ');
  }

  if (/\+|\bgaji\b|\bterima\b|\bmasuk\b/.test(rest)) out.type ??= 'income';
  rest = rest.replace('+', ' ');

  if (/\bkemarin\b/.test(rest)) {
    out.date = 'yesterday';
    rest = rest.replace('kemarin', ' ');
  }

  if (!out.accountId) {
    for (const [alias, id] of aliasToId) {
      const re = new RegExp(`\\b${alias}\\b`);
      if (re.test(rest)) {
        out.accountId = id;
        rest = rest.replace(re, ' ');
        break;
      }
    }
  }

  out.note = rest.replace(/\s+/g, ' ').trim();
  const category = ctx.categories.find((c) => c.keywords.some((k) => out.note.includes(k)));
  out.categoryId = category?.id ?? null;
  if (category?.kind === 'income') out.type ??= 'income';
  return out;
}
