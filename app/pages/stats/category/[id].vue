<script setup lang="ts">
import { ArrowLeft, Inbox } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import HBarList from '@/components/charts/HBarList.vue';
import TrendBars from '@/components/charts/TrendBars.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import PeriodNav from '@/components/layout/PeriodNav.vue';
import TransactionRow from '@/components/money/TransactionRow.vue';
import { useCategories } from '@/features/categories/useCategories';
import { useSearch } from '@/features/search/useSearch';
import { useBreakdown, useStatsPeriod, useTrend } from '@/features/stats/useStats';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { dayKey, dayLabel, MONTHS_SHORT } from '@/lib/time';

// Rincian satu kategori: subkategori, tren 6 bulan, dan daftar transaksinya
// di periode yang sama dengan halaman Statistik.
definePageMeta({ layout: 'app' });

const route = useRoute();
const id = computed(() => String(route.params.id));
const kind = computed<'expense' | 'income'>(() =>
  route.query.type === 'income' ? 'income' : 'expense',
);
const categories = useCategories();
const name = computed(() => categories.label(id.value) || 'Kategori');
useHead({ title: () => `${name.value} · Statistik` });

const { bounds } = useStatsPeriod();
const { slices } = useBreakdown(kind);
const slice = computed(() => slices.value.find((s) => s.id === id.value) ?? null);
const subItems = computed(() =>
  (slice.value?.children ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    value: c.value,
    display: formatRupiah(c.value),
    ...categories.style(c.id === 'none' ? id.value : c.id),
  })),
);

const trend = useTrend(6, id);
const points = computed(() =>
  (trend.data.value ?? []).map((r) => ({
    key: `${r.year}-${r.month}`,
    label: MONTHS_SHORT[r.month - 1]!,
    income: r.income,
    expense: r.expense,
  })),
);

const filters = computed(() => ({
  query: '',
  type: kind.value,
  accountId: null,
  categoryId: id.value,
  from: bounds.value.from,
  to: bounds.value.to,
  min: null,
  max: null,
}));
const results = useSearch(filters, ref(0));
const { rowProps } = useTxDisplay();
const editor = useTxEditor();

const days = computed(() => {
  const groups = new Map<string, NonNullable<typeof results.data.value>['rows']>();
  for (const t of results.data.value?.rows ?? []) {
    const key = dayKey(t.occurred_at);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
});
</script>

<template>
  <div>
    <PageHeader :title="name" :summary="formatRupiah(slice?.value ?? 0)">
      <template #actions>
        <HeaderButton label="Kembali ke Statistik" @click="navigateTo('/stats')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <PeriodNav />
      </template>
    </PageHeader>

    <div class="mt-3.5 grid gap-3.5 md:grid-cols-2 md:items-start">
      <Card>
        <CardHead :title="`Rincian ${bounds.label}`">
          <b class="text-[15px] tabular-nums">{{ formatRupiah(slice?.value ?? 0) }}</b>
        </CardHead>
        <div class="p-1.5 pb-2.5">
          <HBarList v-if="subItems.length" :items="subItems" />
          <p v-else class="m-0 px-2 py-3 text-meta text-muted-foreground">
            Tidak ada transaksi di periode ini.
          </p>
        </div>
      </Card>

      <Card>
        <CardHead title="6 bulan terakhir" />
        <div class="px-3.5 pb-3.5 pt-2">
          <Skeleton v-if="trend.isPending.value" :rows="3" />
          <TrendBars
            v-else
            :points="points"
            :show="kind"
            :label="`Tren ${name} 6 bulan terakhir`"
          />
        </div>
      </Card>
    </div>

    <Card
      v-if="results.isPending.value && results.fetchStatus.value === 'fetching'"
      class="mt-3.5 p-1"
    >
      <Skeleton :rows="4" />
    </Card>
    <Card v-else-if="!results.data.value?.rows.length" class="mt-3.5">
      <EmptyState
        :icon="Inbox"
        title="Belum ada transaksi"
        :description="`Tidak ada transaksi ${name} di ${bounds.label}.`"
      />
    </Card>
    <template v-else>
      <p class="mx-2.5 mb-0 mt-4 text-meta font-semibold tabular-nums">
        {{ results.data.value.count }} transaksi
      </p>
      <ListGroup v-for="d in days" :key="d.key" :label="dayLabel(d.items[0]!.occurred_at)">
        <TransactionRow
          v-for="t in d.items"
          :key="t.id"
          v-bind="rowProps(t)"
          @select="editor.edit(t)"
        />
      </ListGroup>
    </template>
  </div>
</template>
