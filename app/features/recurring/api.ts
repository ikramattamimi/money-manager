import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

export type RecurringRule = Tables<'recurring_rules'>;
export type RecurringFrequency = RecurringRule['frequency'];
export type PendingRecurring = Tables<'recurring_pending'> & { rule: RecurringRule };

export const recurringApi = {
  async rules(bookId: string): Promise<RecurringRule[]> {
    const { data, error } = await useSupabase()
      .from('recurring_rules')
      .select('*')
      .eq('book_id', bookId)
      .order('active', { ascending: false })
      .order('next_run_on')
      .order('name');
    if (error) throw new Error('Gagal memuat transaksi berulang.', { cause: error });
    return data;
  },

  async create(input: TablesInsert<'recurring_rules'>): Promise<void> {
    const { error } = await useSupabase().from('recurring_rules').insert(input);
    if (error) throw new Error('Gagal menyimpan transaksi berulang.', { cause: error });
  },

  async update(id: string, patch: TablesUpdate<'recurring_rules'>): Promise<void> {
    const { error } = await useSupabase().from('recurring_rules').update(patch).eq('id', id);
    if (error) throw new Error('Gagal menyimpan transaksi berulang.', { cause: error });
  },

  async remove(id: string): Promise<void> {
    const { error } = await useSupabase().from('recurring_rules').delete().eq('id', id);
    if (error) throw new Error('Gagal menghapus transaksi berulang.', { cause: error });
  },

  /** Draf "Perlu dikonfirmasi" beserta aturannya, yang paling lama dulu */
  async pending(bookId: string): Promise<PendingRecurring[]> {
    const { data, error } = await useSupabase()
      .from('recurring_pending')
      .select('*, rule:recurring_rules(*)')
      .eq('book_id', bookId)
      .order('due_on');
    if (error) throw new Error('Gagal memuat draf berulang.', { cause: error });
    return data as unknown as PendingRecurring[];
  },

  /** Catat draf; `amount` untuk nominal yang berbeda dari aturannya */
  async confirm(pendingId: string, amount?: number): Promise<void> {
    const { error } = await useSupabase().rpc('confirm_recurring', {
      p_pending_id: pendingId,
      p_amount: amount,
    });
    if (error) throw new Error('Gagal mencatat transaksi berulang.', { cause: error });
  },

  async skip(pendingId: string): Promise<void> {
    const { error } = await useSupabase().from('recurring_pending').delete().eq('id', pendingId);
    if (error) throw new Error('Gagal melewati draf.', { cause: error });
  },

  /** Jalankan yang sudah jatuh tempo untuk buku ini (tanpa menunggu pg_cron besok pagi) */
  async runDue(bookId: string): Promise<number> {
    const { data, error } = await useSupabase().rpc('post_due_recurring', { p_book_id: bookId });
    if (error) throw new Error('Gagal menjalankan transaksi berulang.', { cause: error });
    return data;
  },
};
