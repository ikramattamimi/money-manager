import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { accountKeys } from '@/features/accounts/keys';
import { useActiveBook } from '@/features/books/useActiveBook';
import { transactionKeys } from '@/features/transactions/keys';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';
import { recurringApi, type PendingRecurring, type RecurringFrequency } from './api';

export const recurringKeys = {
  all: ['recurring'] as const,
  rules: (bookId: string | null) => [...recurringKeys.all, 'rules', bookId] as const,
  pending: (bookId: string | null) => [...recurringKeys.all, 'pending', bookId] as const,
};

export const FREQUENCY_LABEL: Record<RecurringFrequency, { one: string; unit: string }> = {
  daily: { one: 'Setiap hari', unit: 'hari' },
  weekly: { one: 'Setiap minggu', unit: 'minggu' },
  monthly: { one: 'Setiap bulan', unit: 'bulan' },
  yearly: { one: 'Setiap tahun', unit: 'tahun' },
};

export function useRecurringRules() {
  const { bookId } = useActiveBook();
  return useQuery({
    queryKey: computed(() => recurringKeys.rules(bookId.value)),
    queryFn: () => recurringApi.rules(bookId.value!),
    enabled: computed(() => !!bookId.value),
  });
}

export function usePendingRecurring() {
  const { bookId } = useActiveBook();
  return useQuery({
    queryKey: computed(() => recurringKeys.pending(bookId.value)),
    queryFn: () => recurringApi.pending(bookId.value!),
    enabled: computed(() => !!bookId.value),
  });
}

/** Aturan, draf, transaksi, dan saldo bisa berubah sekaligus */
function useInvalidate() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      [recurringKeys.all, transactionKeys.all, accountKeys.all].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );
}

export function useRecurringMutations() {
  const { bookId } = useActiveBook();
  const invalidate = useInvalidate();
  const toast = useToast();
  const onError = (error: Error) => toast.show(error.message);

  // Setelah aturan disimpan, yang jatuh tempo hari ini langsung dicatat
  const runDue = async () => {
    if (bookId.value) await recurringApi.runDue(bookId.value);
    return invalidate();
  };

  return {
    create: useMutation({
      mutationFn: (input: TablesInsert<'recurring_rules'>) => recurringApi.create(input),
      onSuccess: runDue,
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'recurring_rules'> }) =>
        recurringApi.update(id, patch),
      onSuccess: runDue,
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => recurringApi.remove(id),
      onSuccess: invalidate,
      onError,
    }),
    confirm: useMutation({
      mutationFn: ({ pending, amount }: { pending: PendingRecurring; amount?: number }) =>
        recurringApi.confirm(pending.id, amount),
      onSuccess: (_, { pending }) => {
        toast.show(`${pending.rule.name} dicatat`);
        return invalidate();
      },
      onError,
    }),
    skip: useMutation({
      mutationFn: (pending: PendingRecurring) => recurringApi.skip(pending.id),
      onSuccess: (_, pending) => {
        toast.show(`${pending.rule.name} dilewati`);
        return invalidate();
      },
      onError,
    }),
  };
}
