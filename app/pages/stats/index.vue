<script setup lang="ts">
import { PieChart } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import CompositionBar from '@/components/charts/CompositionBar.vue';
import TrendBars from '@/components/charts/TrendBars.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import PeriodKindPicker from '@/components/layout/PeriodKindPicker.vue';
import PeriodNav from '@/components/layout/PeriodNav.vue';
import BudgetSummary from '@/components/money/BudgetSummary.vue';
import { useBreakdown, useStatsPeriod, useTrend } from '@/features/stats/useStats';
import { formatRupiah } from '@/lib/format';
import { MONTHS_SHORT } from '@/lib/time';

// Statistik: komposisi per kategori untuk periode pilihan, ringkasan budget,
// dan tren 6 bulan. Tap kategori → rincian. Agregasi di database (RPC).
definePageMeta({ layout: 'app' });
useHead({ title: 'Statistik · Money Manager' });

const { bounds } = useStatsPeriod();
const kind = useState<'expense' | 'income'>('stats:kind', () => 'expense');
const KINDS = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
] as const;

const { query, slices, total } = useBreakdown(kind);
const parts = computed(() =>
  slices.value.map((s) => ({
    key: s.id,
    label: s.label,
    value: s.value,
    display: formatRupiah(s.value),
    tone: s.tone,
  })),
);

const trend = useTrend(6);
const points = computed(() =>
  (trend.data.value ?? []).map((r) => ({
    key: `${r.year}-${r.month}`,
    label: MONTHS_SHORT[r.month - 1]!,
    income: r.income,
    expense: r.expense,
  })),
);

function openCategory(id: string) {
  if (id === 'none') return;
  navigateTo({ path: `/stats/category/${id}`, query: { type: kind.value } });
}
</script>

<template>
  <div>
    <PageHeader title="Statistik" :summary="formatRupiah(total)">
      <template #actions><PeriodNav /></template>
      <SegmentedControl v-model="kind" :options="KINDS" label="Jenis" variant="on-grad" />
    </PageHeader>

    <PeriodKindPicker class="mt-3.5" />

    <div class="mt-3.5 grid gap-3.5 md:grid-cols-2 md:items-start">
      <Card class="p-3.5">
        <div class="mb-3 flex items-baseline justify-between gap-3">
          <span class="text-panel font-bold">
            {{ kind === 'expense' ? 'Pengeluaran' : 'Pemasukan' }} per kategori
          </span>
          <b class="text-[15px] tabular-nums">{{ formatRupiah(total) }}</b>
        </div>
        <Skeleton v-if="query.isPending.value" :rows="4" />
        <EmptyState
          v-else-if="!parts.length"
          :icon="PieChart"
          :title="kind === 'expense' ? 'Belum ada pengeluaran' : 'Belum ada pemasukan'"
          :description="`Tidak ada transaksi di ${bounds.label}.`"
        />
        <!-- Data lama tetap tampil (redup) selama periode baru dimuat -->
        <div
          v-else
          :class="[
            'transition-opacity duration-200',
            query.isPlaceholderData.value && 'opacity-60',
          ]"
        >
          <CompositionBar
            :parts="parts"
            label="Komposisi per kategori"
            selectable
            @select="openCategory"
          />
        </div>
      </Card>

      <BudgetSummary :year="bounds.endYear" :month="bounds.endMonth" />

      <Card class="md:col-span-2">
        <CardHead title="6 bulan terakhir">
          <span class="text-xs text-muted-foreground"
            >sampai {{ MONTHS_SHORT[bounds.endMonth - 1] }} {{ bounds.endYear }}</span
          >
        </CardHead>
        <div class="px-3.5 pb-3.5 pt-2">
          <Skeleton v-if="trend.isPending.value" :rows="3" />
          <TrendBars v-else :points="points" label="Pemasukan dan pengeluaran 6 bulan terakhir" />
        </div>
      </Card>
    </div>
  </div>
</template>
