import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';
import { templatesApi, type Template } from './api';

export const templateKeys = {
  all: ['templates'] as const,
  list: (bookId: string | null) => [...templateKeys.all, 'list', bookId] as const,
};

export function useTemplates() {
  const { bookId } = useActiveBook();
  return useQuery({
    queryKey: computed(() => templateKeys.list(bookId.value)),
    queryFn: () => templatesApi.list(bookId.value!),
    enabled: computed(() => !!bookId.value),
    staleTime: 5 * 60_000,
  });
}

export function useTemplateMutations() {
  const client = useQueryClient();
  const toast = useToast();
  const invalidate = () => client.invalidateQueries({ queryKey: templateKeys.all });
  const onError = (error: Error) => toast.show(error.message);

  const create = useMutation({
    mutationFn: (input: TablesInsert<'templates'>) => templatesApi.create(input),
    onSuccess: invalidate,
    onError,
  });

  return {
    create,
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'templates'> }) =>
        templatesApi.update(id, patch),
      onSuccess: invalidate,
      onError,
    }),
    /** Hapus dengan Urungkan: template dibuat ulang dengan isi yang sama */
    remove: useMutation({
      mutationFn: (template: Template) => templatesApi.remove(template.id),
      onSuccess: (_, template) => {
        invalidate();
        const { id: _id, created_at: _c, updated_at: _u, ...rest } = template;
        toast.show(`Template ${template.name} dihapus`, () => create.mutate(rest));
      },
      onError,
    }),
    bump: useMutation({
      mutationFn: (id: string) => templatesApi.bump(id),
      onSuccess: invalidate,
    }),
  };
}
