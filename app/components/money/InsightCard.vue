<script setup lang="ts">
import type { Component } from 'vue';
import {
  CalendarDays,
  Gauge,
  Lightbulb,
  PiggyBank,
  Scale,
  TrendingDown,
  TrendingUp,
} from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import type { Tone } from '@/components/data/tone';
import { useBudgetStatus } from '@/features/budgets/useBudgets';
import { useCategories } from '@/features/categories/useCategories';
import { buildInsights, type InsightKind } from '@/features/stats/insight';
import { useInsight } from '@/features/stats/useStats';

// Kartu Ringkasan di Statistik (fase 10 T5): gabungan pemasukan dan
// pengeluaran periode terpilih, dibanding periode sebelumnya. Kalimat netral.
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
  <Card>
    <CardHead title="Ringkasan">
      <span class="text-xs text-muted-foreground">{{ bounds.label }}</span>
    </CardHead>
    <div
      :class="[
        'px-1 pb-1 transition-opacity duration-200',
        query.isPlaceholderData.value && 'opacity-60',
      ]"
    >
      <Skeleton v-if="query.isPending.value" :rows="3" />
      <EmptyState
        v-else-if="!lines.length"
        :icon="Lightbulb"
        title="Belum ada ringkasan"
        :description="`Tidak ada pemasukan atau pengeluaran di ${bounds.label}.`"
      />
      <ul v-else class="m-0 grid list-none gap-0.5 p-0 md:grid-cols-2">
        <li
          v-for="l in lines"
          :key="l.kind"
          class="flex items-start gap-3 rounded-[10px] px-2.5 py-2"
        >
          <ToneIcon :icon="iconFor(l.kind, l.tone)" :tone="l.tone" size="sm" />
          <span class="flex min-w-0 flex-col">
            <b class="text-label font-semibold">{{ l.title }}</b>
            <small class="text-xs text-muted-foreground">{{ l.detail }}</small>
          </span>
        </li>
        <li v-if="budgetLine" class="flex items-start gap-3 rounded-[10px] px-2.5 py-2">
          <ToneIcon :icon="PiggyBank" :tone="budgetLine.tone" size="sm" />
          <span class="flex min-w-0 flex-col">
            <b class="text-label font-semibold">{{ budgetLine.title }}</b>
            <small class="text-xs text-muted-foreground">{{ budgetLine.detail }}</small>
          </span>
        </li>
      </ul>
    </div>
  </Card>
</template>
