import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

export type Template = Tables<'templates'>;

export const templatesApi = {
  /** Paling sering dipakai dulu, lalu urutan manual */
  async list(bookId: string): Promise<Template[]> {
    const { data, error } = await useSupabase()
      .from('templates')
      .select('*')
      .eq('book_id', bookId)
      .order('use_count', { ascending: false })
      .order('sort')
      .order('name');
    if (error) throw new Error('Gagal memuat template.', { cause: error });
    return data;
  },

  async create(input: TablesInsert<'templates'>): Promise<Template> {
    const { data, error } = await useSupabase().from('templates').insert(input).select().single();
    if (error) throw new Error('Gagal menyimpan template.', { cause: error });
    return data;
  },

  async update(id: string, patch: TablesUpdate<'templates'>): Promise<void> {
    const { error } = await useSupabase().from('templates').update(patch).eq('id', id);
    if (error) throw new Error('Gagal menyimpan template.', { cause: error });
  },

  async remove(id: string): Promise<void> {
    const { error } = await useSupabase().from('templates').delete().eq('id', id);
    if (error) throw new Error('Gagal menghapus template.', { cause: error });
  },

  /** Tambah hitungan pemakaian (untuk urutan) */
  async bump(id: string): Promise<void> {
    const { error } = await useSupabase().rpc('bump_template', { p_template_id: id });
    if (error) throw new Error('Gagal mencatat pemakaian template.', { cause: error });
  },
};
