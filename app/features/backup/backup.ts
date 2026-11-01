import type { Tables, TablesInsert } from '@/lib/database.types';

/*
 * Backup satu buku sebagai file JSON (redesign R8, pengganti "Backup iCloud"
 * di mockup). Semua baris disimpan apa adanya; saat dipulihkan, setiap ID
 * diganti baru dan relasinya dipetakan ulang, jadi backup bisa dipulihkan
 * berkali-kali ke buku baru tanpa bentrok. Fungsi di sini murni (tanpa Supabase).
 */

export const BACKUP_FORMAT = 'money-manager-backup';
export const BACKUP_VERSION = 1;

export interface BookBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  book: Pick<Tables<'books'>, 'name' | 'month_start_day' | 'currency'>;
  accountGroups: Tables<'account_groups'>[];
  accountTotals: Tables<'account_totals'>[];
  accounts: Tables<'accounts'>[];
  categories: Tables<'categories'>[];
  recurringRules: Tables<'recurring_rules'>[];
  transactions: Tables<'transactions'>[];
  transactionOffsets: Tables<'transaction_offsets'>[];
  budgets: Tables<'budgets'>[];
  templates: Tables<'templates'>[];
}

export interface BackupCounts {
  accounts: number;
  categories: number;
  transactions: number;
  budgets: number;
  templates: number;
  recurringRules: number;
}

export const countsOf = (b: BookBackup): BackupCounts => ({
  accounts: b.accounts.length,
  categories: b.categories.length,
  transactions: b.transactions.length,
  budgets: b.budgets.length,
  templates: b.templates.length,
  recurringRules: b.recurringRules.length,
});

/** Baca dan periksa isi file; galat dengan pesan yang bisa ditampilkan */
export function parseBackup(text: string): BookBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File ini bukan backup Money Manager (bukan JSON).');
  }
  const b = data as Partial<BookBackup>;
  if (b.format !== BACKUP_FORMAT) throw new Error('File ini bukan backup Money Manager.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION)
    throw new Error('Backup ini dibuat versi app yang lebih baru. Perbarui app dulu.');
  const lists = [
    'accountGroups',
    'accountTotals',
    'accounts',
    'categories',
    'recurringRules',
    'transactions',
    'transactionOffsets',
    'budgets',
    'templates',
  ] as const;
  for (const key of lists)
    if (!Array.isArray(b[key])) throw new Error('Backup tidak lengkap atau rusak.');
  if (!b.book?.name) throw new Error('Backup tidak lengkap atau rusak.');
  return b as BookBackup;
}

export interface RestoreRows {
  accountGroups: TablesInsert<'account_groups'>[];
  accountTotals: TablesInsert<'account_totals'>[];
  accounts: TablesInsert<'accounts'>[];
  /** Kategori induk dulu, baru anak (pemicu database memeriksa induknya) */
  categories: TablesInsert<'categories'>[];
  recurringRules: TablesInsert<'recurring_rules'>[];
  transactions: TablesInsert<'transactions'>[];
  transactionOffsets: TablesInsert<'transaction_offsets'>[];
  budgets: TablesInsert<'budgets'>[];
  templates: TablesInsert<'templates'>[];
}

/**
 * Baris siap disisipkan ke buku `bookId`: ID baru dari `newId`, relasi dipetakan
 * ulang. Kolom milik sistem (waktu dibuat/diubah, pembuat, batch impor) dilepas.
 */
export function remapBackup(b: BookBackup, bookId: string, newId: () => string): RestoreRows {
  const ids = new Map<string, string>();
  const fresh = (old: string) => {
    const id = newId();
    ids.set(old, id);
    return id;
  };
  const ref = (old: string | null | undefined) => (old ? (ids.get(old) ?? null) : null);
  const must = (old: string, what: string) => {
    const id = ids.get(old);
    if (!id) throw new Error(`Backup rusak: ${what} tidak ditemukan.`);
    return id;
  };

  const accountGroups = b.accountGroups.map((g) => ({
    id: fresh(g.id),
    book_id: bookId,
    name: g.name,
    kind: g.kind,
    icon: g.icon,
    tone: g.tone,
    sort: g.sort,
  }));
  const accountTotals = b.accountTotals.map((t) => ({
    id: fresh(t.id),
    book_id: bookId,
    name: t.name,
    on_transactions: t.on_transactions,
    sort: t.sort,
  }));
  const accounts = b.accounts.map((a) => ({
    id: fresh(a.id),
    book_id: bookId,
    group_id: must(a.group_id, 'grup akun'),
    total_id: ref(a.total_id),
    name: a.name,
    note: a.note,
    opening_balance: a.opening_balance,
    include_in_total: a.include_in_total,
    archived: a.archived,
    sort: a.sort,
    statement_day: a.statement_day,
    due_day: a.due_day,
  }));
  const ordered = [
    ...b.categories.filter((c) => !c.parent_id),
    ...b.categories.filter((c) => !!c.parent_id),
  ];
  for (const c of ordered) fresh(c.id);
  const categories = ordered.map((c) => ({
    id: ids.get(c.id)!,
    book_id: bookId,
    parent_id: ref(c.parent_id),
    kind: c.kind,
    name: c.name,
    emoji: c.emoji,
    icon: c.icon,
    tone: c.tone,
    archived: c.archived,
    sort: c.sort,
  }));
  const recurringRules = b.recurringRules.map((r) => ({
    id: fresh(r.id),
    book_id: bookId,
    name: r.name,
    type: r.type,
    amount: r.amount,
    fee: r.fee,
    account_id: must(r.account_id, 'akun transaksi berulang'),
    to_account_id: ref(r.to_account_id),
    category_id: ref(r.category_id),
    note: r.note,
    description: r.description,
    frequency: r.frequency,
    interval: r.interval,
    day_of_month: r.day_of_month,
    start_on: r.start_on,
    end_on: r.end_on,
    next_run_on: r.next_run_on,
    auto_post: r.auto_post,
    active: r.active,
  }));
  const transactions = b.transactions.map((t) => ({
    id: fresh(t.id),
    book_id: bookId,
    type: t.type,
    occurred_at: t.occurred_at,
    amount: t.amount,
    fee: t.fee,
    account_id: must(t.account_id, 'akun transaksi'),
    to_account_id: ref(t.to_account_id),
    category_id: ref(t.category_id),
    is_adjustment: t.is_adjustment,
    note: t.note,
    description: t.description,
    source: t.source,
    dedupe_key: t.dedupe_key,
    recurring_rule_id: ref(t.recurring_rule_id),
  }));
  const transactionOffsets = b.transactionOffsets.map((o) => ({
    id: newId(),
    book_id: bookId,
    expense_id: must(o.expense_id, 'transaksi kaitan'),
    income_id: must(o.income_id, 'transaksi kaitan'),
    amount: o.amount,
  }));
  const budgets = b.budgets.map((x) => ({
    id: newId(),
    book_id: bookId,
    category_id: ref(x.category_id),
    amount: x.amount,
    period: x.period,
    start_on: x.start_on,
    carry_over: x.carry_over,
  }));
  const templates = b.templates.map((x) => ({
    id: newId(),
    book_id: bookId,
    name: x.name,
    type: x.type,
    amount: x.amount,
    account_id: ref(x.account_id),
    to_account_id: ref(x.to_account_id),
    category_id: ref(x.category_id),
    note: x.note,
    description: x.description,
    sort: x.sort,
    use_count: x.use_count,
  }));

  return {
    accountGroups,
    accountTotals,
    accounts,
    categories,
    recurringRules,
    transactions,
    transactionOffsets,
    budgets,
    templates,
  };
}
