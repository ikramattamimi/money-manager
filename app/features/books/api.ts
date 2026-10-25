import type { Database, Tables } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

export type Book = Tables<'books'> & { role: Tables<'book_members'>['role'] | null };
export type BookRole = Database['public']['Enums']['book_role'];
export type BookMember = Database['public']['Functions']['book_member_list']['Returns'][number];
export type BookInvite = Tables<'book_invites'>;
export type InvitePreview = Database['public']['Functions']['invite_preview']['Returns'][number];

/** Pesan dari database (trigger/RPC sudah berbahasa Indonesia), atau pesan umum */
function message(error: { message?: string; code?: string }, fallback: string) {
  return error.code === 'P0001' || error.code === '22023' || error.code === '23505'
    ? (error.message ?? fallback)
    : fallback;
}

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

  /** Buku baru: pembuat jadi pemilik, kategori dan akun bawaan dibuat trigger */
  async create(name: string): Promise<Tables<'books'>> {
    const { data, error } = await useSupabase().from('books').insert({ name }).select().single();
    if (error) throw new Error('Gagal membuat buku.', { cause: error });
    return data;
  },

  async rename(id: string, name: string): Promise<void> {
    const { error } = await useSupabase().from('books').update({ name }).eq('id', id);
    if (error) throw new Error('Gagal mengganti nama buku.', { cause: error });
  },

  /** Hapus buku beserta semua isinya (hanya pemilik, ditegakkan RLS) */
  async remove(id: string): Promise<void> {
    const { error } = await useSupabase().from('books').delete().eq('id', id);
    if (error) throw new Error('Gagal menghapus buku.', { cause: error });
  },

  async members(bookId: string): Promise<BookMember[]> {
    const { data, error } = await useSupabase().rpc('book_member_list', { p_book_id: bookId });
    if (error) throw new Error('Gagal memuat anggota.', { cause: error });
    return data;
  },

  async setRole(bookId: string, userId: string, role: BookRole): Promise<void> {
    const { error } = await useSupabase()
      .from('book_members')
      .update({ role })
      .eq('book_id', bookId)
      .eq('user_id', userId);
    if (error) throw new Error(message(error, 'Gagal mengubah peran.'), { cause: error });
  },

  /** Keluarkan anggota, atau keluar sendiri kalau userId = diri sendiri */
  async removeMember(bookId: string, userId: string): Promise<void> {
    const { error } = await useSupabase()
      .from('book_members')
      .delete()
      .eq('book_id', bookId)
      .eq('user_id', userId);
    if (error) throw new Error(message(error, 'Gagal mengeluarkan anggota.'), { cause: error });
  },

  /** Undangan yang belum diterima (hanya terlihat oleh pemilik) */
  async invites(bookId: string): Promise<BookInvite[]> {
    const { data, error } = await useSupabase()
      .from('book_invites')
      .select('*')
      .eq('book_id', bookId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Gagal memuat undangan.', { cause: error });
    return data;
  },

  async invite(bookId: string, email: string, role: BookRole): Promise<BookInvite> {
    const { data, error } = await useSupabase().rpc('create_invite', {
      p_book_id: bookId,
      p_email: email,
      p_role: role,
    });
    if (error) throw new Error(message(error, 'Gagal membuat undangan.'), { cause: error });
    return data as BookInvite;
  },

  async cancelInvite(id: string): Promise<void> {
    const { error } = await useSupabase().from('book_invites').delete().eq('id', id);
    if (error) throw new Error('Gagal membatalkan undangan.', { cause: error });
  },

  async preview(token: string): Promise<InvitePreview | null> {
    const { data, error } = await useSupabase().rpc('invite_preview', { p_token: token });
    if (error) throw new Error('Gagal membuka undangan.', { cause: error });
    return data[0] ?? null;
  },

  /** Terima undangan; kembalikan id buku */
  async accept(token: string): Promise<string> {
    const { data, error } = await useSupabase().rpc('accept_invite', { p_token: token });
    if (error) throw new Error(error.message || 'Gagal menerima undangan.', { cause: error });
    return data;
  },

  /** Kirim email undangan lewat server route (Resend). false = belum disetel. */
  async sendInviteEmail(inviteId: string): Promise<boolean> {
    const { data } = await useSupabase().auth.getSession();
    try {
      const result = await $fetch<{ sent: boolean }>('/api/books/invite-email', {
        method: 'POST',
        body: { inviteId },
        headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {},
      });
      return result.sent;
    } catch {
      return false;
    }
  },
};
