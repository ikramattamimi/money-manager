<script setup lang="ts">
import type { Component } from 'vue';
import { CalendarDays, Gauge, PiggyBank, Scale, TrendingDown, TrendingUp } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import type { Tone } from '@/components/data/tone';
import { useBudgetStatus } from '@/features/budgets/useBudgets';
import { useCategories } from '@/features/categories/useCategories';
import { buildInsights, type InsightKind } from '@/features/stats/insight';
import { useInsight } from '@/features/stats/useStats';

// Ringkasan di Statistik (fase 10 T5): gabungan pemasukan dan pengeluaran
// periode terpilih, dibanding periode sebelumnya. Kalimat netral. Grup iOS.
const { query, bounds, previous, period } = useInsight();
const categories = useCategories();

const lines = computed(() =>
  buildInsights(query.data.value ?? null, {
    from: bounds.value.from,
    to: bounds.value.to,
    prevLabel: previous.value.label,
    categoryLabel: (id) => categories.label(id),
  }),
);

// Budget hanya berlaku per periode bulan
const budgets = useBudgetStatus(
  computed(() => bounds.value.endYear),
  computed(() => bounds.value.endMonth),
);
const budgetLine = computed(() => {
  if (period.value.kind !== 'month') return null;
  const list = budgets.views.value;
  if (!list.length) return null;
  const over = list.filter((b) => b.tone === 'bad').length;
  const near = list.filter((b) => b.tone === 'warn').length;
  const tone: Tone = over ? 'bad' : near ? 'warn' : 'ok';
  const parts = [over && `${over} lewat batas`, near && `${near} hampir habis`].filter(Boolean);
  return {
    tone,
    title: parts.length ? `Budget: ${parts.join(', ')}` : 'Semua budget masih aman',
    detail: `${list.length} budget di ${bounds.value.label}`,
  };
});

const ICONS: Record<InsightKind, Component> = {
  net: Scale,
  compare: TrendingUp,
  pace: Gauge,
  rise: TrendingUp,
  peak: CalendarDays,
};
const iconFor = (kind: InsightKind, tone: Tone) =>
  kind === 'compare' && tone === 'ok' ? TrendingDown : ICONS[kind];
</script>

<template>
  <GroupedList label="Ringkasan" :aside="bounds.label">
    <div
      :class="['transition-opacity duration-200', query.isPlaceholderData.value && 'opacity-60']"
    >
      <p v-if="query.isPending.value" class="m-0 px-4 py-3.5 text-meta text-muted-foreground">
        Memuat ringkasan…
      </p>
      <p v-else-if="!lines.length" class="m-0 px-4 py-3.5 text-meta text-muted-foreground">
        Tidak ada pemasukan atau pengeluaran di {{ bounds.label }}.
      </p>
      <ul v-else class="m-0 list-none p-0">
        <li
          v-for="l in lines"
          :key="l.kind"
          class="insight-row flex items-start gap-3 px-4 py-2.5"
        >
          <ToneIcon :icon="iconFor(l.kind, l.tone)" :tone="l.tone" size="sm" />
          <span class="flex min-w-0 flex-col">
            <b class="text-body font-semibold">{{ l.title }}</b>
            <small class="text-meta text-muted-foreground">{{ l.detail }}</small>
          </span>
        </li>
        <li v-if="budgetLine" class="insight-row flex items-start gap-3 px-4 py-2.5">
          <ToneIcon :icon="PiggyBank" :tone="budgetLine.tone" size="sm" />
          <span class="flex min-w-0 flex-col">
            <b class="text-body font-semibold">{{ budgetLine.title }}</b>
            <small class="text-meta text-muted-foreground">{{ budgetLine.detail }}</small>
          </span>
        </li>
      </ul>
    </div>
  </GroupedList>
</template>

<style scoped>
.insight-row + .insight-row {
  box-shadow: inset 0 0.5px 0 var(--sep);
}
</style>
