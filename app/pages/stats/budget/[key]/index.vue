<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { ChevronLeft, ChevronRight, Layers, Pencil, PiggyBank } from '@lucide/vue';
import BudgetChart from '@/components/charts/BudgetChart.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import IconButton from '@/components/ios/IconButton.vue';
import MonthSwipe from '@/components/ios/MonthSwipe.vue';
import NavBar from '@/components/ios/NavBar.vue';
import SummaryStrip from '@/components/ios/SummaryStrip.vue';
import DayGroup from '@/components/money/DayGroup.vue';
import TxRow from '@/components/money/TxRow.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { budgetsApi } from '@/features/budgets/api';
import { useBudgetMonth } from '@/features/budgets/useBudgetMonth';
import { budgetKeys, useBudgetStatus } from '@/features/budgets/useBudgets';
import { useCategories } from '@/features/categories/useCategories';
import { useSearch } from '@/features/search/useSearch';
import { statsApi } from '@/features/stats/api';
import { statsKeys } from '@/features/stats/useStats';
import { netAmount } from '@/features/transactions/effects';
import { groupByDay } from '@/features/transactions/grouping';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { useMonthTransactions } from '@/features/transactions/useTransactions';
import { formatRupiah } from '@/lib/format';
import {
  addMonths,
  dayKey,
  MONTHS_LONG,
  MONTHS_SHORT,
  periodOf,
  periodRange,
  periodRangeLabel,
} from '@/lib/time';

// Rincian budget (mockup budget-detail): strip Budget / Terpakai / Sisa,
// grafik garis budget + batang terpakai 7 bulan (kolom diketuk = pindah
// bulan), lalu transaksinya. Geser isi = bulan sebelumnya/berikutnya.
// Pensil = ubah nominal. /stats/budget/total, /<id kategori>, atau /other
// (pengeluaran di luar kategori yang punya budget). ?month=2026-10
definePageMeta({ layout: 'app' });

const route = useRoute();
const { bookId, canEdit, monthStartDay } = useActiveBook();
const { ym, year, month, shift, key: monthKey } = useBudgetMonth();
const fromQuery = String(route.query.month ?? '').match(/^(\d{4})-(\d{2})$/);
if (fromQuery) ym.value = { year: Number(fromQuery[1]), month: Number(fromQuery[2]) };
// Bulan ikut di URL supaya kembali/muat ulang tetap di bulan yang sama
watch(monthKey, (k) => navigateTo({ query: { ...route.query, month: k } }, { replace: true }));

const categories = useCategories();
const { views } = useBudgetStatus(year, month);

const key = computed(() => String(route.params.key));
const isOther = computed(() => key.value === 'other');
const categoryId = computed(() => (key.value === 'total' || isOther.value ? null : key.value));
const title = computed(() =>
  isOther.value
    ? 'Lainnya'
    : categoryId.value
      ? categories.label(categoryId.value, true) || 'Budget'
      : 'Semua pengeluaran',
);
const style = computed(() =>
  categoryId.value
    ? categories.style(categoryId.value)
    : {
        icon: isOther.value ? Layers : PiggyBank,
        tone: isOther.value ? ('neutral' as const) : ('primary' as const),
      },
);
useHead({ title: () => `Budget ${title.value} · Money Manager` });

const budget = computed(
  () => views.value.find((v) => (v.category_id ?? 'total') === key.value) ?? null,
);
const range = computed(() => periodRange(year.value, month.value, monthStartDay.value));
const rangeLabel = computed(
  () =>
    periodRangeLabel(year.value, month.value, monthStartDay.value) ||
    `${MONTHS_LONG[month.value - 1]} ${year.value}`,
);

// ---------- transaksi bulan ini ----------
// Kategori/total lewat pencarian (sub-kategori ikut); Lainnya dari daftar bulan
const filters = computed(() => ({
  query: '',
  type: isOther.value ? null : ('expense' as const),
  accountId: null,
  categoryId: isOther.value ? null : categoryId.value,
  from: isOther.value ? null : range.value.from,
  to: isOther.value ? null : range.value.to,
  min: null,
  max: null,
}));
const search = useSearch(filters, ref(0));
const monthTx = useMonthTransactions(year, month);
/** Kategori yang sudah punya budget, termasuk sub dari induk yang punya budget */
const covered = computed(() => {
  const ids = new Set(views.value.flatMap((v) => (v.category_id ? [v.category_id] : [])));
  return (id: string | null) => {
    if (!id) return false;
    const parent = categories.byId.value.get(id)?.parent_id;
    return ids.has(id) || (!!parent && ids.has(parent));
  };
});
const otherRows = computed(() =>
  (monthTx.data.value ?? []).filter(
    (t) => t.type === 'expense' && !t.is_adjustment && !covered.value(t.category_id),
  ),
);
const rows = computed(() => (isOther.value ? otherRows.value : (search.data.value?.rows ?? [])));
const pending = computed(() => (isOther.value ? monthTx.isPending.value : search.isPending.value));
const days = computed(() => groupByDay(rows.value));
const otherTotal = computed(() => otherRows.value.reduce((s, t) => s + netAmount(t), 0));

const strip = computed(() => {
  if (isOther.value)
    return [
      { label: 'Tanpa budget', value: formatRupiah(otherTotal.value), tone: 'exp' as const },
      { label: 'Transaksi', value: String(otherRows.value.length) },
    ];
  const b = budget.value;
  const spent = b?.spent ?? search.data.value?.expense ?? 0;
  return [
    { label: 'Budget', value: formatRupiah(b?.limit ?? 0) },
    { label: 'Terpakai', value: formatRupiah(spent), tone: 'exp' as const },
    {
      label: 'Sisa',
      value: formatRupiah((b?.limit ?? 0) - spent),
      tone: (b?.limit ?? 0) - spent < 0 ? ('exp' as const) : undefined,
    },
  ];
});

// ---------- grafik 7 bulan ----------
const today = computed(() => periodOf(dayKey(new Date()), monthStartDay.value));
const trend = useQuery({
  queryKey: computed(() => [
    ...statsKeys.all,
    'trend',
    bookId.value,
    year.value,
    month.value,
    7,
    categoryId.value,
  ]),
  queryFn: () => statsApi.trend(bookId.value!, year.value, month.value, 7, categoryId.value),
  enabled: computed(() => !!bookId.value && !isOther.value),
  placeholderData: (prev) => prev,
});
const history = useQuery({
  queryKey: computed(() => [...budgetKeys.all, 'history', bookId.value, categoryId.value]),
  queryFn: () => budgetsApi.history(bookId.value!, categoryId.value),
  enabled: computed(() => !!bookId.value && !isOther.value),
});
/** Nominal budget yang berlaku di bulan itu: perubahan terakhir yang sudah mulai */
const budgetIn = (y: number, m: number) => {
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  let amount = 0;
  for (const h of history.data.value ?? []) if (h.start_on <= start) amount = h.amount;
  return amount;
};
const chart = computed(() =>
  (trend.data.value ?? []).map((r) => ({
    key: `${r.year}-${String(r.month).padStart(2, '0')}`,
    label: MONTHS_SHORT[r.month - 1]!,
    spent: r.expense,
    budget: budgetIn(r.year, r.month),
    selected: r.year === year.value && r.month === month.value,
    now: r.year === today.value.year && r.month === today.value.month,
  })),
);
function pickMonth(k: string) {
  const [y, m] = k.split('-').map(Number) as [number, number];
  ym.value = { year: y, month: m };
}

const neighbor = (d: number) => MONTHS_SHORT[addMonths(year.value, month.value, d).month - 1]!;
const { rowView } = useTxDisplay();
const editor = useTxEditor();
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-0 md:mt-0 md:overflow-hidden md:rounded-2xl"
  >
    <NavBar :title="title" back="Budget" back-to="/stats" class="sticky top-0 md:static">
      <template #title>
        <span class="flex items-center justify-center gap-1.5">
          <ToneIcon :icon="style.icon" :tone="style.tone" size="xs" />{{ title }}
        </span>
      </template>
      <template #right>
        <IconButton
          v-if="canEdit && !isOther"
          label="Ubah nominal budget"
          accent
          :to="`/stats/budget/${key}/edit?month=${monthKey}`"
        >
          <Pencil class="!size-5" aria-hidden="true" />
        </IconButton>
      </template>
      <div class="flex items-center justify-center gap-0.5 pb-1.5">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          class="grid size-11 place-items-center rounded-xl active:bg-fill-press"
          @click="shift(-1)"
        >
          <ChevronLeft class="size-5" stroke-width="2.2" aria-hidden="true" />
        </button>
        <span class="min-w-[190px] text-center text-bar font-semibold tracking-[-0.02em]">{{
          rangeLabel
        }}</span>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          class="grid size-11 place-items-center rounded-xl active:bg-fill-press"
          @click="shift(1)"
        >
          <ChevronRight class="size-5" stroke-width="2.2" aria-hidden="true" />
        </button>
      </div>
    </NavBar>

    <SummaryStrip :items="strip" />

    <MonthSwipe
      :month-key="monthKey"
      :prev-label="neighbor(-1)"
      :next-label="neighbor(1)"
      class="min-h-[60dvh]"
      @shift="shift"
    >
      <div v-if="!isOther" class="bg-card px-2 pb-2.5 pt-2.5 shadow-[inset_0_-0.5px_0_var(--sep)]">
        <BudgetChart
          :points="chart"
          :label="`Budget dan pengeluaran ${title} 7 bulan sampai ${MONTHS_SHORT[month - 1]} ${year}`"
          @pick="pickMonth"
        />
      </div>
      <p v-else class="mx-8 mb-0 mt-3 text-meta text-muted-foreground">
        Pengeluaran di kategori yang belum punya budget bulan ini.
      </p>

      <EmptyCard
        v-if="!pending && !rows.length"
        title="Belum ada data"
        :description="`Tidak ada pengeluaran ${title} di periode ini.`"
      />
      <div v-else class="pb-4">
        <DayGroup
          v-for="d in days"
          :key="d.key"
          :day-key="d.key"
          :income="d.income"
          :expense="d.expense"
        >
          <TxRow
            v-for="t in d.items"
            :id="t.id"
            :key="t.id"
            v-bind="rowView(t)"
            :selectable="false"
            @open="editor.edit(t)"
          />
        </DayGroup>
      </div>
    </MonthSwipe>
  </div>
</template>
