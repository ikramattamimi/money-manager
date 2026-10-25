import { useQuery } from '@tanstack/vue-query';
import type { Tone } from '@/components/data/tone';
import { keepWithinBook, useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { transactionKeys } from '@/features/transactions/keys';
import { statsApi } from './api';
import { periodBounds, shiftPeriod, todayWib, type Period } from './period';

export const statsKeys = {
  // Di bawah kunci transaksi: setiap transaksi berubah, statistik ikut dimuat ulang
  all: [...transactionKeys.all, 'stats'] as const,
  breakdown: (bookId: string | null, from: string, to: string, type: string) =>
    [...statsKeys.all, 'breakdown', bookId, from, to, type] as const,
  trend: (bookId: string | null, y: number, m: number, n: number, c: string | null) =>
    [...statsKeys.all, 'trend', bookId, y, m, n, c] as const,
  insight: (bookId: string | null, from: string, to: string) =>
    [...statsKeys.all, 'insight', bookId, from, to] as const,
};

/** Periode statistik yang dipilih, bertahan saat pindah tab */
export function useStatsPeriod() {
  const { monthStartDay } = useActiveBook();
  const period = useState<Period>('stats:period', () => ({ kind: 'month', anchor: todayWib() }));
  const bounds = computed(() => periodBounds(period.value, monthStartDay.value));
  return { period, bounds, monthStartDay };
}

export interface CategorySlice {
  id: string;
  label: string;
  value: number;
  count: number;
  tone: Tone;
  icon: ReturnType<ReturnType<typeof useCategories>['style']>['icon'];
  /** Rincian subkategori (termasuk transaksi di induknya sendiri) */
  children: { id: string; label: string; value: number; count: number }[];
}

/**
 * Komposisi per kategori utama untuk periode. Data lama tetap tampil selama
 * memuat periode baru, jadi angka berganti tanpa layar berkedip.
 */
export function useBreakdown(type: Ref<'income' | 'expense'>) {
  const { bookId } = useActiveBook();
  const { bounds } = useStatsPeriod();
  const categories = useCategories();

  const query = useQuery({
    queryKey: computed(() =>
      statsKeys.breakdown(bookId.value, bounds.value.from, bounds.value.to, type.value),
    ),
    queryFn: () =>
      statsApi.breakdown(bookId.value!, bounds.value.from, bounds.value.to, type.value),
    enabled: computed(() => !!bookId.value),
    placeholderData: keepWithinBook(bookId),
  });

  const slices = computed<CategorySlice[]>(() => {
    const groups = new Map<string, CategorySlice>();
    for (const row of query.data.value ?? []) {
      const rootId = row.root_id ?? 'none';
      const style = categories.style(row.root_id);
      const group =
        groups.get(rootId) ??
        ({
          id: rootId,
          label: row.root_id
            ? categories.label(row.root_id) || 'Kategori terhapus'
            : 'Tanpa kategori',
          value: 0,
          count: 0,
          tone: row.root_id ? style.tone : 'neutral',
          icon: style.icon,
          children: [],
        } satisfies CategorySlice);
      group.value += row.total;
      group.count += row.tx_count;
      group.children.push({
        id: row.category_id ?? 'none',
        label:
          row.category_id && row.category_id !== row.root_id
            ? categories.label(row.category_id)
            : `${group.label} (umum)`,
        value: row.total,
        count: row.tx_count,
      });
      groups.set(rootId, group);
    }
    return [...groups.values()]
      .map((g) => ({ ...g, children: g.children.sort((a, b) => b.value - a.value) }))
      .sort((a, b) => b.value - a.value);
  });

  const total = computed(() => slices.value.reduce((s, x) => s + x.value, 0));
  return { query, slices, total };
}

/** Tren pemasukan/pengeluaran `months` bulan berakhir di bulan terakhir periode */
export function useTrend(months = 6, categoryId: Ref<string | null> = ref(null)) {
  const { bookId } = useActiveBook();
  const { bounds } = useStatsPeriod();
  return useQuery({
    queryKey: computed(() =>
      statsKeys.trend(
        bookId.value,
        bounds.value.endYear,
        bounds.value.endMonth,
        months,
        categoryId.value,
      ),
    ),
    queryFn: () =>
      statsApi.trend(
        bookId.value!,
        bounds.value.endYear,
        bounds.value.endMonth,
        months,
        categoryId.value,
      ),
    enabled: computed(() => !!bookId.value),
    placeholderData: keepWithinBook(bookId),
  });
}

/** Angka kartu Ringkasan untuk periode terpilih, dibanding periode sebelumnya */
export function useInsight() {
  const { bookId } = useActiveBook();
  const { period, bounds, monthStartDay } = useStatsPeriod();
  const previous = computed(() =>
    periodBounds(shiftPeriod(period.value, -1, monthStartDay.value), monthStartDay.value),
  );
  const query = useQuery({
    queryKey: computed(() => statsKeys.insight(bookId.value, bounds.value.from, bounds.value.to)),
    queryFn: () => statsApi.insight(bookId.value!, bounds.value, previous.value),
    enabled: computed(() => !!bookId.value),
    placeholderData: keepWithinBook(bookId),
  });
  return { query, bounds, previous, period };
}
