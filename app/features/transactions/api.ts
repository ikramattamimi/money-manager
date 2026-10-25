import type { Database, Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';
import { periodRange } from '@/lib/time';

export type Transaction = Tables<'transactions'>;
export type TxType = Transaction['type'];
export type MonthOverview = Database['public']['Functions']['months_overview']['Returns'][number];

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
      .select('*')
      .eq('book_id', bookId)
      .gte('occurred_at', from)
      .lt('occurred_at', to)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(MONTH_LIMIT);
    if (error) throw new Error('Gagal memuat transaksi.', { cause: error });
    return data;
  },

  async get(id: string): Promise<Transaction> {
    const { data, error } = await useSupabase()
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error('Transaksi tidak ditemukan.', { cause: error });
    return data;
  },

  async monthsOverview(bookId: string, year: number): Promise<MonthOverview[]> {
    const { data, error } = await useSupabase().rpc('months_overview', {
      p_book_id: bookId,
      p_year: year,
    });
    if (error) throw new Error('Gagal memuat ringkasan bulanan.', { cause: error });
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

function friendly(message: string, fallback: string) {
  if (/transactions_shape/.test(message))
    return 'Transfer butuh akun tujuan yang berbeda dari akun asal.';
  if (/Kategori/.test(message)) return message;
  return fallback;
}
