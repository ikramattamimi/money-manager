import { useQuery } from '@tanstack/vue-query';
import type { Database } from '@/lib/database.types';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useSupabase } from '@/lib/supabase';

export type Suggestion = Database['public']['Functions']['suggest_from_note']['Returns'][number];

export const suggestApi = {
  /** Kategori, akun, dan nominal yang paling sering untuk catatan mirip */
  async fromNote(bookId: string, note: string): Promise<Suggestion | null> {
    const { data, error } = await useSupabase().rpc('suggest_from_note', {
      p_book_id: bookId,
      p_note: note,
    });
    if (error) throw new Error('Gagal memuat saran.', { cause: error });
    return data[0] ?? null;
  },
};

/**
 * Saran dari riwayat untuk catatan yang sedang diketik. Ditunda 250 ms setelah
 * berhenti mengetik; hasil per catatan disimpan 10 menit.
 */
export function useSuggest(note: Ref<string>) {
  const { bookId } = useActiveBook();
  const settled = ref('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(
    note,
    (value) => {
      clearTimeout(timer);
      const clean = value.trim().toLowerCase();
      timer = setTimeout(() => (settled.value = clean), clean ? 250 : 0);
    },
    { immediate: true },
  );
  onScopeDispose(() => clearTimeout(timer));

  const query = useQuery({
    queryKey: computed(() => ['suggest', bookId.value, settled.value] as const),
    queryFn: () => suggestApi.fromNote(bookId.value!, settled.value),
    enabled: computed(() => !!bookId.value && settled.value.length >= 3),
    staleTime: 10 * 60_000,
  });

  /** null saat catatan sudah berubah tapi saran belum diperbarui */
  return computed(() =>
    settled.value === note.value.trim().toLowerCase() && settled.value.length >= 3
      ? (query.data.value ?? null)
      : null,
  );
}
