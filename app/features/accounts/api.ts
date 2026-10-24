import type { Database, Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

export type AccountGroup = Tables<'account_groups'>;
export type Account = Tables<'accounts'> & { balance: number };
export type LedgerRow = Database['public']['Functions']['account_ledger']['Returns'][number];

export const accountsApi = {
  async groups(bookId: string): Promise<AccountGroup[]> {
    const { data, error } = await useSupabase()
      .from('account_groups')
      .select('*')
      .eq('book_id', bookId)
      .order('sort');
    if (error) throw new Error('Gagal memuat grup akun.', { cause: error });
    return data;
  },

  /** Akun beserta saldonya (dari view account_balances, dihitung di database) */
  async list(bookId: string): Promise<Account[]> {
    const supabase = useSupabase();
    const [accounts, balances] = await Promise.all([
      supabase.from('accounts').select('*').eq('book_id', bookId).order('sort').order('name'),
      supabase.from('account_balances').select('account_id, balance').eq('book_id', bookId),
    ]);
    if (accounts.error) throw new Error('Gagal memuat akun.', { cause: accounts.error });
    if (balances.error) throw new Error('Gagal memuat saldo akun.', { cause: balances.error });
    const balanceOf = new Map(balances.data.map((b) => [b.account_id, b.balance ?? 0]));
    return accounts.data.map((a) => ({ ...a, balance: balanceOf.get(a.id) ?? a.opening_balance }));
  },

  async create(input: TablesInsert<'accounts'>): Promise<void> {
    const { error } = await useSupabase().from('accounts').insert(input);
    if (error) throw new Error('Gagal menambah akun.', { cause: error });
  },

  async update(id: string, patch: TablesUpdate<'accounts'>): Promise<void> {
    const { error } = await useSupabase().from('accounts').update(patch).eq('id', id);
    if (error) throw new Error('Gagal menyimpan akun.', { cause: error });
  },

  /** Simpan urutan baru: setiap id mendapat sort sesuai posisinya */
  async reorder(ids: string[]): Promise<void> {
    const supabase = useSupabase();
    const results = await Promise.all(
      ids.map((id, sort) => supabase.from('accounts').update({ sort }).eq('id', id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error('Gagal menyimpan urutan akun.', { cause: failed.error });
  },

  /** Riwayat akun dengan saldo berjalan, terbaru dulu */
  async ledger(accountId: string, limit = 100, offset = 0): Promise<LedgerRow[]> {
    const { data, error } = await useSupabase().rpc('account_ledger', {
      p_account_id: accountId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new Error('Gagal memuat riwayat akun.', { cause: error });
    return data;
  },

  /** Buat transaksi koreksi sebesar selisih; null kalau saldo sudah sama */
  async adjust(accountId: string, actual: number): Promise<Tables<'transactions'> | null> {
    const { data, error } = await useSupabase().rpc('adjust_balance', {
      p_account_id: accountId,
      p_actual: actual,
    });
    if (error) throw new Error('Gagal menyesuaikan saldo.', { cause: error });
    return data && (data as Tables<'transactions'>).id ? (data as Tables<'transactions'>) : null;
  },
};
