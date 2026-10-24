import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { AccountKind } from '#shared/types/import';
import { accountKeys } from '@/features/accounts/keys';
import { useActiveBook } from '@/features/books/useActiveBook';
import { categoryKeys } from '@/features/categories/keys';
import { transactionKeys } from '@/features/transactions/keys';
import { importApi } from './api';
import { importKeys } from './keys';

/** Setelah impor disimpan/dibatalkan, semua data buku bisa berubah */
function useInvalidateBook() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      [accountKeys.all, categoryKeys.all, transactionKeys.all, importKeys.all].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );
}

export function useImportFlow() {
  const { bookId } = useActiveBook();
  const invalidate = useInvalidateBook();

  return {
    preview: useMutation({
      mutationFn: (file: File) => importApi.preview(file, bookId.value!),
    }),
    commit: useMutation({
      mutationFn: ({ file, kinds }: { file: File; kinds: Record<string, AccountKind> }) =>
        importApi.commit(file, bookId.value!, kinds),
      onSuccess: invalidate,
    }),
  };
}

export function useImportHistory() {
  const { bookId } = useActiveBook();
  return useQuery({
    queryKey: computed(() => importKeys.history(bookId.value)),
    queryFn: () => importApi.history(bookId.value!),
    enabled: computed(() => !!bookId.value),
  });
}

export function useRevertImport() {
  const invalidate = useInvalidateBook();
  const toast = useToast();
  return useMutation({
    mutationFn: (batchId: string) => importApi.revert(batchId),
    onSuccess: (count) => {
      toast.show(`Impor dibatalkan · ${count} transaksi dihapus`);
      return invalidate();
    },
    onError: (error: Error) => toast.show(error.message),
  });
}
