import type { Database } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

export type BudgetStatus = Database['public']['Functions']['budget_status']['Returns'][number];

export const budgetsApi = {
  /** Budget yang berlaku di bulan itu beserta pemakaiannya */
  async status(bookId: string, year: number, month: number): Promise<BudgetStatus[]> {
    const { data, error } = await useSupabase().rpc('budget_status', {
      p_book_id: bookId,
      p_year: year,
      p_month: month,
    });
    if (error) throw new Error('Gagal memuat budget.', { cause: error });
    return data;
  },

  /**
   * Atur budget mulai bulan `startOn` (tanggal 1). Bulan sebelumnya tetap
   * memakai nominal lama. `categoryId` null = budget total.
   */
  async set(input: {
    bookId: string;
    categoryId: string | null;
    amount: number;
    carryOver: boolean;
    startOn: string;
  }): Promise<void> {
    const { error } = await useSupabase().from('budgets').upsert(
      {
        book_id: input.bookId,
        category_id: input.categoryId,
        amount: input.amount,
        carry_over: input.carryOver,
        start_on: input.startOn,
        period: 'monthly',
      },
      { onConflict: 'book_id,category_id,period,start_on' },
    );
    if (error) throw new Error('Gagal menyimpan budget.', { cause: error });
  },

  /** Hapus budget kategori ini untuk semua bulan */
  async remove(bookId: string, categoryId: string | null): Promise<void> {
    let query = useSupabase().from('budgets').delete().eq('book_id', bookId);
    query = categoryId ? query.eq('category_id', categoryId) : query.is('category_id', null);
    const { error } = await query;
    if (error) throw new Error('Gagal menghapus budget.', { cause: error });
  },
};
