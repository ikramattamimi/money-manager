import type { Database } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

type Fn = Database['public']['Functions'];
export type BreakdownRow = Fn['category_breakdown']['Returns'][number];
export type TrendRow = Fn['monthly_trend']['Returns'][number];

export const statsApi = {
  /** Total per kategori (dengan induknya) untuk [from, to) */
  async breakdown(
    bookId: string,
    from: string,
    to: string,
    type: 'income' | 'expense',
  ): Promise<BreakdownRow[]> {
    const { data, error } = await useSupabase().rpc('category_breakdown', {
      p_book_id: bookId,
      p_from: from,
      p_to: to,
      p_type: type,
    });
    if (error) throw new Error('Gagal memuat statistik kategori.', { cause: error });
    return data;
  },

  /** Pemasukan dan pengeluaran per bulan, `months` bulan berakhir di (year, month) */
  async trend(
    bookId: string,
    year: number,
    month: number,
    months = 6,
    categoryId: string | null = null,
  ): Promise<TrendRow[]> {
    const { data, error } = await useSupabase().rpc('monthly_trend', {
      p_book_id: bookId,
      p_year: year,
      p_month: month,
      p_months: months,
      p_category_id: categoryId ?? undefined,
    });
    if (error) throw new Error('Gagal memuat tren bulanan.', { cause: error });
    return data;
  },
};
