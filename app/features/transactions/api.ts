import type { Database, Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';
import { periodRange } from '@/lib/time';

/** Transaksi lawan dalam kaitan reimburse/utang (fase 10 T6) */
export interface LinkedTx {
  id: string;
  note: string;
  occurredAt: string;
  /** Nominal yang dikaitkan */
  amount: number;
}

/** Baris transaksi; `linked` = kaitan ke pengeluaran (untuk pemasukan) atau pengganti (untuk pengeluaran) */
export type Transaction = Tables<'transactions'> & { linked?: LinkedTx[] };
export type OffsetCandidate =
  Database['public']['Functions']['offset_candidates']['Returns'][number];
export type TxType = Transaction['type'];
export type MonthOverview = Database['public']['Functions']['months_overview']['Returns'][number];
export type YearOverview = Database['public']['Functions']['years_overview']['Returns'][number];

/** Kolom yang diisi form; id dibuat di client supaya bisa diurungkan seketika */
export type TxInput = Pick<
  TablesInsert<'transactions'>,
  | 'id'
  | 'book_id'
  | 'type'
  | 'amount'
  | 'occurred_at'
  | 'account_id'
  | 'to_account_id'
  | 'fee'
  | 'category_id'
  | 'note'
  | 'description'
  | 'source'
  | 'is_adjustment'
>;

// Kolom transaksi + kaitannya dari dua arah (FK expense_id / income_id)
const TX_SELECT = `*,
  as_expense:transaction_offsets!transaction_offsets_expense_id_fkey(
    amount, other:transactions!transaction_offsets_income_id_fkey(id, note, occurred_at)),
  as_income:transaction_offsets!transaction_offsets_income_id_fkey(
    amount, other:transactions!transaction_offsets_expense_id_fkey(id, note, occurred_at))`;

type OffsetEmbed = {
  amount: number;
  other: { id: string; note: string; occurred_at: string } | null;
}[];

/** Ratakan kaitan hasil embed jadi `linked` */
function withLinks(
  row: Tables<'transactions'> & { as_expense?: OffsetEmbed; as_income?: OffsetEmbed },
): Transaction {
  const { as_expense, as_income, ...tx } = row;
  const linked = [...(as_expense ?? []), ...(as_income ?? [])].flatMap((o) =>
    o.other
      ? [{ id: o.other.id, note: o.other.note, occurredAt: o.other.occurred_at, amount: o.amount }]
      : [],
  );
  return linked.length ? { ...tx, linked } : tx;
}

// Batas aman per bulan. Bulan tersibuk di data Realbyte user ~90 transaksi.
const MONTH_LIMIT = 1000;

export const transactionsApi = {
  async listMonth(
    bookId: string,
    year: number,
    month: number,
    startDay: number,
  ): Promise<Transaction[]> {
    const { from, to } = periodRange(year, month, startDay);
    const { data, error } = await useSupabase()
      .from('transactions')
      .select(TX_SELECT)
      .eq('book_id', bookId)
      .gte('occurred_at', from)
      .lt('occurred_at', to)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(MONTH_LIMIT);
    if (error) throw new Error('Gagal memuat transaksi.', { cause: error });
    return (data as unknown as Parameters<typeof withLinks>[0][]).map(withLinks);
  },

  async get(id: string): Promise<Transaction> {
    const { data, error } = await useSupabase()
      .from('transactions')
      .select(TX_SELECT)
      .eq('id', id)
      .single();
    if (error) throw new Error('Transaksi tidak ditemukan.', { cause: error });
    return withLinks(data as unknown as Parameters<typeof withLinks>[0]);
  },

  async monthsOverview(bookId: string, year: number): Promise<MonthOverview[]> {
    const { data, error } = await useSupabase().rpc('months_overview', {
      p_book_id: bookId,
      p_year: year,
    });
    if (error) throw new Error('Gagal memuat ringkasan bulanan.', { cause: error });
    return data;
  },

  /** Ringkasan per tahun (tampilan Tahunan), terbaru dulu */
  async yearsOverview(bookId: string): Promise<YearOverview[]> {
    const { data, error } = await useSupabase().rpc('years_overview', { p_book_id: bookId });
    if (error) throw new Error('Gagal memuat ringkasan tahunan.', { cause: error });
    return data;
  },

  async create(input: TxInput): Promise<void> {
    const { error } = await useSupabase().from('transactions').insert(input);
    if (error)
      throw new Error(friendly(error.message, 'Gagal menyimpan transaksi.'), { cause: error });
  },

  async update(id: string, patch: TablesUpdate<'transactions'>): Promise<void> {
    const { error } = await useSupabase().from('transactions').update(patch).eq('id', id);
    if (error)
      throw new Error(friendly(error.message, 'Gagal menyimpan perubahan.'), { cause: error });
  },

  async remove(id: string): Promise<void> {
    const { error } = await useSupabase().from('transactions').delete().eq('id', id);
    if (error) throw new Error('Gagal menghapus transaksi.', { cause: error });
  },
};

/** Kaitan pemasukan ↔ pengeluaran yang digantinya (reimburse, utang) */
export const offsetsApi = {
  /** Pengeluaran yang masih punya sisa; `incomeId` = pemasukan yang sedang diedit */
  async candidates(
    bookId: string,
    incomeId: string | null,
    query: string,
  ): Promise<OffsetCandidate[]> {
    const { data, error } = await useSupabase().rpc('offset_candidates', {
      p_book_id: bookId,
      ...(incomeId ? { p_income_id: incomeId } : {}),
      ...(query.trim() ? { p_query: query.trim() } : {}),
    });
    if (error) throw new Error('Gagal memuat pengeluaran.', { cause: error });
    return data;
  },

  /** Ganti semua kaitan sebuah pemasukan; [] = lepas semua */
  async setForIncome(incomeId: string, links: { expenseId: string; amount: number }[]) {
    const { error } = await useSupabase().rpc('set_income_offsets', {
      p_income_id: incomeId,
      p_links: links.map((l) => ({ expense_id: l.expenseId, amount: l.amount })),
    });
    if (error)
      throw new Error(friendly(error.message, 'Gagal menyimpan kaitan.'), { cause: error });
  },

  /** Lepas satu kaitan (dari sisi pengeluaran) */
  async unlink(expenseId: string, incomeId: string) {
    const { error } = await useSupabase()
      .from('transaction_offsets')
      .delete()
      .eq('expense_id', expenseId)
      .eq('income_id', incomeId);
    if (error) throw new Error('Gagal melepas kaitan.', { cause: error });
  },

  /** Pasang lagi kaitan transaksi yang dihapus lalu diurungkan */
  async restore(tx: Transaction, linked: LinkedTx[]) {
    const { error } = await useSupabase()
      .from('transaction_offsets')
      .insert(
        linked.map((l) => ({
          book_id: tx.book_id,
          expense_id: tx.type === 'expense' ? tx.id : l.id,
          income_id: tx.type === 'income' ? tx.id : l.id,
          amount: l.amount,
        })),
      );
    if (error) throw new Error('Kaitan transaksi tidak bisa dipulihkan.', { cause: error });
  },
};

function friendly(message: string, fallback: string) {
  // Pesan penjaga kaitan dari database sudah berbahasa Indonesia
  if (/kaitan|dikaitkan/i.test(message)) return message;
  if (/transactions_shape/.test(message))
    return 'Transfer butuh akun tujuan yang berbeda dari akun asal.';
  if (/Kategori/.test(message)) return message;
  return fallback;
}
