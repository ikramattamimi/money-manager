import type { Transaction } from '@/features/transactions/api';
import type { Database } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

type Fn = Database['public']['Functions'];
export type BreakdownRow = Fn['category_breakdown']['Returns'][number];
export type TrendRow = Fn['monthly_trend']['Returns'][number];
export type InsightRow = Fn['period_insight']['Returns'][number];
export type NoteRow = Fn['note_breakdown']['Returns'][number];

export const statsApi = {
  /** Angka mentah kartu Ringkasan: periode [from, to) dan periode sebelumnya */
  async insight(
    bookId: string,
    current: { from: string; to: string },
    previous: { from: string; to: string },
  ): Promise<InsightRow | null> {
    const { data, error } = await useSupabase().rpc('period_insight', {
      p_book_id: bookId,
      p_from: current.from,
      p_to: current.to,
      p_prev_from: previous.from,
      p_prev_to: previous.to,
    });
    if (error) throw new Error('Gagal memuat ringkasan.', { cause: error });
    return data[0] ?? null;
  },

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

  /**
   * Transaksi tanpa kategori di [from, to), terbaru dulu. RPC pencarian tidak
   * bisa menyaring kategori kosong, jadi dibaca langsung (RLS tetap berlaku).
   */
  async uncategorized(
    bookId: string,
    from: string,
    to: string,
    type: 'income' | 'expense',
  ): Promise<Transaction[]> {
    const { data, error } = await useSupabase()
      .from('transactions')
      .select('*')
      .eq('book_id', bookId)
      .eq('type', type)
      .eq('is_adjustment', false)
      .is('category_id', null)
      .gte('occurred_at', from)
      .lt('occurred_at', to)
      .order('occurred_at', { ascending: false })
      .limit(2000);
    if (error) throw new Error('Gagal memuat transaksi tanpa kategori.', { cause: error });
    return data;
  },

  /** Total per catatan (toko/tempat) untuk [from, to), terbesar dulu */
  async notes(
    bookId: string,
    from: string,
    to: string,
    type: 'income' | 'expense',
  ): Promise<NoteRow[]> {
    const { data, error } = await useSupabase().rpc('note_breakdown', {
      p_book_id: bookId,
      p_from: from,
      p_to: to,
      p_type: type,
    });
    if (error) throw new Error('Gagal memuat statistik per catatan.', { cause: error });
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
