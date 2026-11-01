<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import MonthBars from '@/components/charts/MonthBars.vue';
import { IOS_TONE } from '@/components/data/tone';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import NavBar from '@/components/ios/NavBar.vue';
import DayGroup from '@/components/money/DayGroup.vue';
import TxRow from '@/components/money/TxRow.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { useSearch } from '@/features/search/useSearch';
import { statsApi } from '@/features/stats/api';
import { statsKeys, useBreakdown, useStatsPeriod, useTrend } from '@/features/stats/useStats';
import { groupByDay } from '@/features/transactions/grouping';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah, formatShort } from '@/lib/format';
import { addMonths, MONTHS_SHORT, periodOf, periodRange, periodStartDate } from '@/lib/time';

// Rincian satu kategori (mockup stats-category): batang 6 bulan dengan garis
// rata-rata (kolom diketuk = pindah bulan), sub-kategori dengan persen, lalu
// transaksinya per hari di periode yang sama dengan Statistik.
// /stats/category/none = transaksi tanpa kategori.
definePageMeta({ layout: 'app' });

const route = useRoute();
const id = computed(() => String(route.params.id));
const kind = computed<'expense' | 'income'>(() =>
  route.query.type === 'income' ? 'income' : 'expense',
);
const categories = useCategories();
const { bookId } = useActiveBook();
/** "Tanpa kategori": data dibaca langsung karena RPC tidak bisa menyaring kategori kosong */
const isNone = computed(() => id.value === 'none');
const name = computed(() =>
  isNone.value ? 'Tanpa kategori' : categories.label(id.value) || 'Kategori',
);
useHead({ title: () => `${name.value} · Statistik` });

const { period, bounds, monthStartDay } = useStatsPeriod();
const { slices } = useBreakdown(kind);
const slice = computed(() => slices.value.find((s) => s.id === id.value) ?? null);
const color = computed(
  () =>
    `var(--tone-${IOS_TONE[slice.value?.tone ?? (isNone.value ? 'neutral' : categories.style(id.value).tone)]})`,
);
const pct = (v: number) => (slice.value?.value ? Math.round((v / slice.value.value) * 100) : 0);

const trend = useTrend(
  6,
  computed(() => (isNone.value ? null : id.value)),
);
// Tanpa kategori: 6 bulan transaksi dibaca sekali, dijumlah per periode bulan di sini
const noneRange = computed(() => {
  const first = addMonths(bounds.value.endYear, bounds.value.endMonth, -5);
  return {
    from: periodRange(first.year, first.month, monthStartDay.value).from,
    to: periodRange(bounds.value.endYear, bounds.value.endMonth, monthStartDay.value).to,
  };
});
const noneTx = useQuery({
  queryKey: computed(() => [
    ...statsKeys.all,
    'uncategorized',
    bookId.value,
    noneRange.value.from,
    noneRange.value.to,
    kind.value,
  ]),
  queryFn: () =>
    statsApi.uncategorized(bookId.value!, noneRange.value.from, noneRange.value.to, kind.value),
  enabled: computed(() => isNone.value && !!bookId.value),
});

const points = computed(() => {
  const isCurrent = (y: number, m: number) =>
    y === bounds.value.endYear && m === bounds.value.endMonth;
  if (isNone.value) {
    const sums = new Map<string, number>();
    for (const t of noneTx.data.value ?? []) {
      const p = periodOf(t.occurred_at, monthStartDay.value);
      const key = `${p.year}-${p.month}`;
      sums.set(key, (sums.get(key) ?? 0) + t.amount);
    }
    return Array.from({ length: 6 }, (_, i) => {
      const { year: y, month: m } = addMonths(bounds.value.endYear, bounds.value.endMonth, i - 5);
      return {
        key: `${y}-${m}`,
        label: MONTHS_SHORT[m - 1]!,
        value: sums.get(`${y}-${m}`) ?? 0,
        current: isCurrent(y, m),
      };
    });
  }
  return (trend.data.value ?? []).map((r) => ({
    key: `${r.year}-${r.month}`,
    label: MONTHS_SHORT[r.month - 1]!,
    value: kind.value === 'income' ? r.income : r.expense,
    current: isCurrent(r.year, r.month),
  }));
});
const average = computed(() =>
  points.value.length ? points.value.reduce((s, p) => s + p.value, 0) / points.value.length : 0,
);
/** Ketuk kolom: Statistik pindah ke bulan itu (periode jadi bulanan) */
function pickMonth(key: string) {
  const [y, m] = key.split('-').map(Number) as [number, number];
  period.value = { kind: 'month', anchor: periodStartDate(y, m, monthStartDay.value) };
}

const filters = computed(() =>
  isNone.value
    ? {
        query: '',
        type: null,
        accountId: null,
        categoryId: null,
        from: null,
        to: null,
        min: null,
        max: null,
      }
    : {
        query: '',
        type: kind.value,
        accountId: null,
        categoryId: id.value,
        from: bounds.value.from,
        to: bounds.value.to,
        min: null,
        max: null,
      },
);
const results = useSearch(filters, ref(0));
// Daftar tanpa kategori: bagian periode terpilih dari data 6 bulan di atas
const rows = computed(() =>
  isNone.value
    ? (noneTx.data.value ?? []).filter(
        (t) => t.occurred_at >= bounds.value.from && t.occurred_at < bounds.value.to,
      )
    : (results.data.value?.rows ?? []),
);
const pending = computed(() => (isNone.value ? noneTx.isPending.value : results.isPending.value));
const { rowView } = useTxDisplay();
const editor = useTxEditor();
const days = computed(() => groupByDay(rows.value));
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-0 md:mt-0 md:overflow-hidden md:rounded-2xl"
  >
    <NavBar :title="name" back="Statistik" back-to="/stats" line class="sticky top-0 md:static" />

    <div class="bg-card px-4 pb-1.5 pt-3.5">
      <div class="flex items-baseline justify-between gap-3">
        <b class="text-body">{{ bounds.label }}</b>
        <span class="text-meta text-muted-foreground"
          >rata-rata {{ formatShort(Math.round(average)) }}</span
        >
      </div>
      <MonthBars
        class="mt-2"
        :points="points"
        :color="color"
        :label="`${name} 6 bulan terakhir`"
        @pick="pickMonth"
      />
    </div>

    <GroupedList
      v-if="!isNone"
      :label="`Sub-kategori · ${bounds.label}`"
      :aside="formatRupiah(slice?.value ?? 0)"
    >
      <p v-if="!slice?.children.length" class="m-0 px-4 py-3.5 text-meta text-muted-foreground">
        Tidak ada transaksi di periode ini.
      </p>
      <div
        v-for="c in slice?.children ?? []"
        :key="c.id"
        class="sub-row flex min-h-12 items-center gap-3 py-2 pl-4 pr-3.5"
      >
        <span
          class="grid h-6 min-w-11 place-items-center rounded-[7px] text-xs font-bold text-white"
          :style="{ background: color }"
          >{{ pct(c.value) }}%</span
        >
        <b class="min-w-0 flex-1 truncate text-row font-medium">{{ c.label }}</b>
        <span class="shrink-0 text-row font-semibold">{{ formatRupiah(c.value) }}</span>
      </div>
    </GroupedList>

    <EmptyCard
      v-if="!pending && !rows.length"
      title="Belum ada transaksi"
      :description="`Tidak ada transaksi ${name} di ${bounds.label}.`"
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
  </div>
</template>

<style scoped>
.sub-row {
  position: relative;
}
.sub-row + .sub-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 0;
  height: 0.5px;
  background: var(--sep);
}
</style>
