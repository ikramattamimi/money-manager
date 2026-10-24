import type { Tables } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

export type Book = Tables<'books'> & { role: Tables<'book_members'>['role'] | null };

export const booksApi = {
  /** Buku yang bisa diakses user, beserta perannya di tiap buku. */
  async list(userId: string): Promise<Book[]> {
    const { data, error } = await useSupabase()
      .from('books')
      .select('*, book_members(role, user_id)')
      .order('created_at');
    if (error) throw new Error('Gagal memuat daftar buku.', { cause: error });

    return data.map(({ book_members, ...book }) => ({
      ...book,
      role: book_members.find((m) => m.user_id === userId)?.role ?? null,
    }));
  },
};
