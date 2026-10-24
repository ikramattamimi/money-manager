<script setup lang="ts">
import { PieChart } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CompositionBar from '@/components/charts/CompositionBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import MonthPicker from '@/components/layout/MonthPicker.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { useCategories } from '@/features/categories/useCategories';
import { useMonthTransactions } from '@/features/transactions/useTransactions';
import { formatRupiah } from '@/lib/format';
import { addMonths, jakartaParts, MONTHS_SHORT } from '@/lib/time';

// Statistik dasar: komposisi per kategori utama untuk bulan aktif.
// Grafik tren, budget, dan detail per kategori menyusul di fase 7.
definePageMeta({ layout: 'app' });
useHead({ title: 'Statistik · Money Manager' });

const categories = useCategories();

// Bulan sama dengan halaman Transaksi
const today = jakartaParts(new Date());
const year = useState('tx:year', () => today.year);
const month = useState('tx:month', () => today.month);
const isCurrent = computed(() => year.value === today.year && month.value === today.month);
function shiftMonth(delta: number) {
  const next = addMonths(year.value, month.value, delta);
  year.value = next.year;
  month.value = next.month;
}

const KINDS = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
] as const;
const kind = ref<'expense' | 'income'>('expense');

const { data: txs, isPending } = useMonthTransactions(year, month);

const parts = computed(() => {
  const by = new Map<string, number>();
  for (const t of txs.value ?? []) {
    if (t.type !== kind.value || t.is_adjustment) continue;
    // Subkategori digabung ke induknya
    const c = t.category_id ? categories.byId.value.get(t.category_id) : undefined;
    const key = c?.parent_id ?? t.category_id ?? 'none';
    by.set(key, (by.get(key) ?? 0) + t.amount);
  }
  return [...by.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => ({
      key: id,
      label: categories.label(id) || 'Tanpa kategori',
      value,
      display: formatRupiah(value),
      tone: categories.style(id).tone,
    }));
});
const total = computed(() => parts.value.reduce((s, p) => s + p.value, 0));
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Statistik">
      <template #actions>
        <MonthPicker
          :label="`${MONTHS_SHORT[month - 1]} ${year}`"
          :can-next="!isCurrent"
          @prev="shiftMonth(-1)"
          @next="shiftMonth(1)"
        />
      </template>
      <SegmentedControl v-model="kind" :options="KINDS" label="Jenis" variant="on-grad" />
    </PageHeader>

    <Card class="mt-3.5 p-3.5">
      <Skeleton v-if="isPending" :rows="4" />
      <EmptyState
        v-else-if="!parts.length"
        :icon="PieChart"
        :title="kind === 'expense' ? 'Belum ada pengeluaran' : 'Belum ada pemasukan'"
        description="Catat transaksi bulan ini untuk melihat komposisinya."
      />
      <template v-else>
        <div class="mb-3 flex items-baseline justify-between">
          <span class="text-panel font-bold"
            >{{ kind === 'expense' ? 'Pengeluaran' : 'Pemasukan' }} per kategori</span
          >
          <b class="text-[15px] tabular-nums">{{ formatRupiah(total) }}</b>
        </div>
        <CompositionBar :parts="parts" label="Komposisi per kategori" />
      </template>
    </Card>
    <p class="mt-3.5 text-center text-xs text-faint">
      Tren, budget, dan detail kategori hadir di pembaruan berikutnya.
    </p>
  </div>
</template>
