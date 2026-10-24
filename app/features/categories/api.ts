import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

export type Category = Tables<'categories'>;
export type CategoryKind = Category['kind'];

export const categoriesApi = {
  /** Semua kategori buku, termasuk yang diarsipkan (transaksi lama tetap butuh namanya) */
  async list(bookId: string): Promise<Category[]> {
    const { data, error } = await useSupabase()
      .from('categories')
      .select('*')
      .eq('book_id', bookId)
      .order('sort')
      .order('name');
    if (error) throw new Error('Gagal memuat kategori.', { cause: error });
    return data;
  },

  async create(input: TablesInsert<'categories'>): Promise<Category> {
    const { data, error } = await useSupabase().from('categories').insert(input).select().single();
    if (error)
      throw new Error(friendly(error.message, 'Gagal menambah kategori.'), { cause: error });
    return data;
  },

  async update(id: string, patch: TablesUpdate<'categories'>): Promise<void> {
    const { error } = await useSupabase().from('categories').update(patch).eq('id', id);
    if (error)
      throw new Error(friendly(error.message, 'Gagal menyimpan kategori.'), { cause: error });
  },

  /** Simpan urutan baru: setiap id mendapat sort sesuai posisinya */
  async reorder(ids: string[]): Promise<void> {
    const supabase = useSupabase();
    const results = await Promise.all(
      ids.map((id, sort) => supabase.from('categories').update({ sort }).eq('id', id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error('Gagal menyimpan urutan kategori.', { cause: failed.error });
  },
};

// Pesan dari trigger database sudah berbahasa Indonesia; selain itu pakai pesan umum
function friendly(message: string, fallback: string) {
  return /kategori|subkategori/i.test(message) ? message : fallback;
}
