import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';
import { categoriesApi, type Category, type CategoryKind } from './api';
import { asTone, categoryIcon } from './icons';
import { categoryKeys } from './keys';

export interface CategoryNode extends Category {
  children: Category[];
}

export function useCategories() {
  const { bookId } = useActiveBook();
  const query = useQuery({
    queryKey: computed(() => categoryKeys.list(bookId.value)),
    queryFn: () => categoriesApi.list(bookId.value!),
    enabled: computed(() => !!bookId.value),
    staleTime: 5 * 60_000,
  });

  const byId = computed(() => new Map((query.data.value ?? []).map((c) => [c.id, c])));

  /** Pohon 2 level per jenis; `includeArchived` untuk halaman pengaturan */
  function tree(kind: CategoryKind, includeArchived = false): CategoryNode[] {
    const all = (query.data.value ?? []).filter(
      (c) => c.kind === kind && (includeArchived || !c.archived),
    );
    return all
      .filter((c) => !c.parent_id)
      .map((parent) => ({ ...parent, children: all.filter((c) => c.parent_id === parent.id) }));
  }

  /** Nama tampilan: "Makan & Minum › Kopi" untuk subkategori */
  function label(id: string | null | undefined, full = false): string {
    const c = id ? byId.value.get(id) : undefined;
    if (!c) return '';
    const parent = c.parent_id ? byId.value.get(c.parent_id) : undefined;
    return full && parent ? `${parent.name} › ${c.name}` : c.name;
  }

  function style(id: string | null | undefined) {
    const c = id ? byId.value.get(id) : undefined;
    return { icon: categoryIcon(c?.icon), tone: asTone(c?.tone) };
  }

  return { ...query, byId, tree, label, style };
}

export function useCategoryMutations() {
  const client = useQueryClient();
  const toast = useToast();
  const invalidate = () => client.invalidateQueries({ queryKey: categoryKeys.all });
  const onError = (error: Error) => toast.show(error.message);

  return {
    create: useMutation({
      mutationFn: (input: TablesInsert<'categories'>) => categoriesApi.create(input),
      onSuccess: invalidate,
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'categories'> }) =>
        categoriesApi.update(id, patch),
      onSuccess: invalidate,
      onError,
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) => categoriesApi.reorder(ids),
      // Urutan baru langsung terlihat; dikembalikan kalau gagal
      onMutate: async (ids) => {
        await client.cancelQueries({ queryKey: categoryKeys.all });
        const saved = client.getQueriesData<Category[]>({ queryKey: categoryKeys.all });
        const sortOf = new Map(ids.map((id, sort) => [id, sort]));
        client.setQueriesData<Category[]>({ queryKey: categoryKeys.all }, (list) =>
          list
            ?.map((c) => (sortOf.has(c.id) ? { ...c, sort: sortOf.get(c.id)! } : c))
            .sort((a, b) => a.sort - b.sort),
        );
        return saved;
      },
      onError: (error: Error, _ids, saved) => {
        saved?.forEach(([key, data]) => client.setQueryData(key, data));
        onError(error);
      },
      onSettled: invalidate,
    }),
  };
}
