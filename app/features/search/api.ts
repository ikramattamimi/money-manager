import type { Transaction, TxType } from '@/features/transactions/api';
import { useSupabase } from '@/lib/supabase';

export interface SearchFilters {
  query: string;
  type: TxType | null;
  accountId: string | null;
  categoryId: string | null;
  /** ISO UTC, [from, to) */
  from: string | null;
  to: string | null;
  min: number | null;
  max: number | null;
}

export interface SearchResult {
  rows: Transaction[];
  count: number;
  income: number;
  expense: number;
}

export const PAGE_SIZE = 100;

export const searchApi = {
  /** Cari di catatan/keterangan + filter; total dihitung dari semua hasil */
  async search(bookId: string, f: SearchFilters, page = 0): Promise<SearchResult> {
    const supabase = useSupabase();
    const { data, error } = await supabase.rpc('search_transactions', {
      p_book_id: bookId,
      p_query: f.query.trim() || undefined,
      p_type: f.type ?? undefined,
      p_account_id: f.accountId ?? undefined,
      p_category_id: f.categoryId ?? undefined,
      p_from: f.from ?? undefined,
      p_to: f.to ?? undefined,
      p_min: f.min ?? undefined,
      p_max: f.max ?? undefined,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    });
    if (error) throw new Error('Pencarian gagal.', { cause: error });
    if (!data.length) return { rows: [], count: 0, income: 0, expense: 0 };

    const ids = data.map((r) => r.id);
    const { data: rows, error: rowsError } = await supabase
      .from('transactions')
      .select('*')
      .in('id', ids);
    if (rowsError) throw new Error('Pencarian gagal.', { cause: rowsError });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      rows: ids.flatMap((id) => byId.get(id) ?? []),
      count: data[0]!.total_count,
      income: data[0]!.total_income,
      expense: data[0]!.total_expense,
    };
  },
};
