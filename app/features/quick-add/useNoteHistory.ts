import { useQuery } from '@tanstack/vue-query';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useSupabase } from '@/lib/supabase';

/** Catatan unik dari riwayat buku yang memuat teks yang diketik, terbaru dulu */
async function searchNotes(bookId: string, text: string): Promise<string[]> {
  const escaped = text.replace(/[\\%_,()]/g, ' ').trim();
  const { data, error } = await useSupabase()
    .from('transactions')
    .select('note')
    .eq('book_id', bookId)
    .ilike('note', `%${escaped}%`)
    .order('occurred_at', { ascending: false })
    .limit(40);
  if (error) throw new Error('Gagal memuat riwayat catatan.', { cause: error });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data) {
    const note = row.note?.trim();
    if (!note || seen.has(note.toLowerCase())) continue;
    seen.add(note.toLowerCase());
    out.push(note);
    if (out.length >= 6) break;
  }
  return out;
}

/**
 * Daftar catatan yang pernah ada dan cocok dengan yang sedang diketik.
 * Ditunda 200 ms setelah berhenti mengetik; kosong kalau teks kosong.
 */
export function useNoteHistory(text: Ref<string>, enabled: Ref<boolean>) {
  const { bookId } = useActiveBook();
  const settled = ref('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(
    text,
    (value) => {
      clearTimeout(timer);
      const clean = value.trim();
      timer = setTimeout(() => (settled.value = clean), clean ? 200 : 0);
    },
    { immediate: true },
  );
  onScopeDispose(() => clearTimeout(timer));

  const query = useQuery({
    queryKey: computed(() => ['note-history', bookId.value, settled.value.toLowerCase()] as const),
    queryFn: () => searchNotes(bookId.value!, settled.value),
    enabled: computed(() => enabled.value && !!bookId.value && settled.value.length >= 1),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });

  return computed(() => {
    if (!settled.value || settled.value !== text.value.trim()) return [];
    const typed = text.value.trim().toLowerCase();
    // Sembunyikan kalau satu-satunya saran sama persis dengan ketikan
    return (query.data.value ?? []).filter((n) => n.toLowerCase() !== typed);
  });
}
