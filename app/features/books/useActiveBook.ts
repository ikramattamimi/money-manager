import type { Ref } from 'vue';
import { useBooks } from './useBooks';

const STORAGE_KEY = 'mm-active-book';

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Buku yang sedang dibuka, disimpan per perangkat. Kalau buku tersimpan sudah
 * tidak bisa diakses (dihapus, keluar), jatuh ke buku pertama milik user.
 * `canEdit` false untuk peran viewer: tombol tambah/edit/hapus disembunyikan
 * (RLS tetap menolak di database).
 */
export function useActiveBook() {
  const { data: books, isPending, error } = useBooks();
  const selectedId = useState<string | null>('book:active', () => readStored());

  const book = computed(() => {
    const list = books.value ?? [];
    return (
      list.find((b) => b.id === selectedId.value) ??
      list.find((b) => b.role === 'owner') ??
      list[0] ??
      null
    );
  });

  /** Pindah buku. Semua query memakai bookId di kuncinya, jadi data tidak tercampur. */
  function setActiveBook(id: string) {
    selectedId.value = id;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Mode privat: pilihan berlaku sampai app ditutup
    }
  }

  return {
    book,
    books,
    bookId: computed(() => book.value?.id ?? null),
    role: computed(() => book.value?.role ?? null),
    canEdit: computed(() => book.value?.role === 'owner' || book.value?.role === 'editor'),
    isOwner: computed(() => book.value?.role === 'owner'),
    /** Tanggal awal periode bulan buku ini (1–31) */
    monthStartDay: computed(() => book.value?.month_start_day ?? 1),
    setActiveBook,
    isPending,
    error,
  };
}

/**
 * Untuk `placeholderData`: tampilkan data lama selama memuat periode/filter
 * baru, tapi tidak pernah data dari buku lain.
 */
export function keepWithinBook(bookId: Ref<string | null>) {
  return <T>(previous: T | undefined, query?: { queryKey: readonly unknown[] }) =>
    query && bookId.value && query.queryKey.includes(bookId.value) ? previous : undefined;
}
