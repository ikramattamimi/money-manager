import { useBooks } from './useBooks';

/**
 * Buku yang sedang dibuka. Sampai fase 9 (pindah buku) selalu buku pertama
 * yang user miliki, atau buku pertama yang bisa diakses.
 * `canEdit` false untuk peran viewer: tombol tambah/edit/hapus disembunyikan
 * (RLS tetap menolak di database).
 */
export function useActiveBook() {
  const { data: books, isPending, error } = useBooks();

  const book = computed(() => {
    const list = books.value ?? [];
    return list.find((b) => b.role === 'owner') ?? list[0] ?? null;
  });

  return {
    book,
    bookId: computed(() => book.value?.id ?? null),
    role: computed(() => book.value?.role ?? null),
    canEdit: computed(() => book.value?.role === 'owner' || book.value?.role === 'editor'),
    isPending,
    error,
  };
}
