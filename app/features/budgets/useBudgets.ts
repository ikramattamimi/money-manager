import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { Tone } from '@/components/data/tone';
import { keepWithinBook, useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { transactionKeys } from '@/features/transactions/keys';
import { budgetsApi, type BudgetStatus } from './api';

// Di bawah kunci transaksi: pemakaian budget ikut diperbarui setiap transaksi berubah
export const budgetKeys = {
  all: [...transactionKeys.all, 'budgets'] as const,
  status: (bookId: string | null, y: number, m: number) =>
    [...budgetKeys.all, bookId, y, m] as const,
};

export interface BudgetView extends BudgetStatus {
  label: string;
  /** Budget bulan ini + sisa bulan lalu (kalau dibawa) */
  limit: number;
  remaining: number;
  ratio: number;
  /** Aman, hampir habis (≥ 80%), atau lewat */
  tone: Extract<Tone, 'ok' | 'warn' | 'bad'>;
}

export function budgetTone(ratio: number): BudgetView['tone'] {
  return ratio > 1 ? 'bad' : ratio >= 0.8 ? 'warn' : 'ok';
}

export function useBudgetStatus(year: Ref<number>, month: Ref<number>) {
  const { bookId } = useActiveBook();
  const categories = useCategories();
  const query = useQuery({
    queryKey: computed(() => budgetKeys.status(bookId.value, year.value, month.value)),
    queryFn: () => budgetsApi.status(bookId.value!, year.value, month.value),
    enabled: computed(() => !!bookId.value),
    placeholderData: keepWithinBook(bookId),
  });

  const views = computed<BudgetView[]>(() =>
    (query.data.value ?? [])
      .map((b) => {
        const limit = b.amount + b.carried;
        const ratio = limit ? b.spent / limit : 0;
        return {
          ...b,
          label: b.category_id ? categories.label(b.category_id, true) : 'Semua pengeluaran',
          limit,
          remaining: limit - b.spent,
          ratio,
          tone: budgetTone(ratio),
        };
      })
      // Budget total dulu, lalu yang paling mendekati habis
      .sort((a, b) => Number(!!a.category_id) - Number(!!b.category_id) || b.ratio - a.ratio),
  );
  return { query, views };
}

export function useBudgetMutations() {
  const client = useQueryClient();
  const toast = useToast();
  const { bookId } = useActiveBook();
  const invalidate = () => client.invalidateQueries({ queryKey: budgetKeys.all });
  const onError = (error: Error) => toast.show(error.message);

  return {
    set: useMutation({
      mutationFn: (input: {
        categoryId: string | null;
        amount: number;
        carryOver: boolean;
        startOn: string;
      }) => budgetsApi.set({ ...input, bookId: bookId.value! }),
      onSuccess: invalidate,
      onError,
    }),
    remove: useMutation({
      mutationFn: (categoryId: string | null) => budgetsApi.remove(bookId.value!, categoryId),
      onSuccess: invalidate,
      onError,
    }),
  };
}
