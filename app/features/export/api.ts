import { useSupabase } from '@/lib/supabase';
import type { ExportTx } from './realbyteRows';

const PAGE = 1000;
const COLUMNS =
  'occurred_at, type, amount, fee, account_id, to_account_id, category_id, is_adjustment, note, description';

export const exportApi = {
  /** Semua transaksi di rentang [from, to), urut waktu; diambil per 1.000 baris */
  async transactions(bookId: string, from: string | null, to: string | null): Promise<ExportTx[]> {
    const out: ExportTx[] = [];
    for (let offset = 0; ; offset += PAGE) {
      let query = useSupabase()
        .from('transactions')
        .select(COLUMNS)
        .eq('book_id', bookId)
        .order('occurred_at')
        .order('created_at')
        .range(offset, offset + PAGE - 1);
      if (from) query = query.gte('occurred_at', from);
      if (to) query = query.lt('occurred_at', to);
      const { data, error } = await query;
      if (error) throw new Error('Gagal mengambil transaksi untuk ekspor.', { cause: error });
      out.push(...(data as ExportTx[]));
      if (data.length < PAGE) return out;
    }
  },
};
