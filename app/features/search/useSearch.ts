import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import { useActiveBook } from '@/features/books/useActiveBook';
import { transactionKeys } from '@/features/transactions/keys';
import { searchApi, type SearchFilters } from './api';

// Di bawah kunci transaksi: hasil ikut diperbarui setiap transaksi berubah
export const searchKeys = {
  all: [...transactionKeys.all, 'search'] as const,
  results: (bookId: string | null, f: SearchFilters, page: number) =>
    [...searchKeys.all, bookId, f, page] as const,
};

export const EMPTY_FILTERS: SearchFilters = {
  query: '',
  type: null,
  accountId: null,
  categoryId: null,
  from: null,
  to: null,
  min: null,
  max: null,
};

export const hasFilter = (f: SearchFilters) =>
  !!(f.query.trim() || f.type || f.accountId || f.categoryId || f.from || f.to || f.min || f.max);

/** Hasil pencarian; teks ditunda 250 ms setelah berhenti mengetik */
export function useSearch(filters: Ref<SearchFilters>, page: Ref<number>) {
  const { bookId } = useActiveBook();
  const settled = ref<SearchFilters>({ ...filters.value });
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(
    filters,
    (f) => {
      clearTimeout(timer);
      const textOnly = f.query !== settled.value.query;
      timer = setTimeout(() => (settled.value = { ...f }), textOnly ? 250 : 0);
    },
    { deep: true },
  );
  onScopeDispose(() => clearTimeout(timer));

  return useQuery({
    queryKey: computed(() => searchKeys.results(bookId.value, settled.value, page.value)),
    queryFn: () => searchApi.search(bookId.value!, settled.value, page.value),
    enabled: computed(() => !!bookId.value && hasFilter(settled.value)),
    placeholderData: keepPreviousData,
  });
}
