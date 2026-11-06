<script setup lang="ts">
import { formatShort } from '@/lib/format';

// Grafik rincian budget (mockup budget-detail .bchart): batang pengeluaran
// per bulan (pudar) dan garis budget dengan titik; bulan terpilih titiknya
// penuh dan labelnya tebal, bulan berjalan labelnya merah. Kolom bisa
// diketuk untuk pindah bulan. Warna dari token nada merah.
const props = defineProps<{
  points: {
    key: string;
    label: string;
    spent: number;
    budget: number;
    selected?: boolean;
    now?: boolean;
  }[];
  label: string;
}>();
const emit = defineEmits<{ pick: [key: string] }>();

const W = 55;
const H = 100;
const TOP = 10;
const max = computed(() => Math.max(1, ...props.points.flatMap((p) => [p.spent, p.budget])));
const y = (v: number) => TOP + H - (v / max.value) * H;
const bars = computed(() =>
  props.points.map((p, i) => {
    const h = p.spent ? Math.max(2, (p.spent / max.value) * H) : 0;
    return {
      ...p,
      x: i * W + (W - 18) / 2,
      h,
      by: TOP + H - h,
      cx: i * W + W / 2,
      cy: y(p.budget),
    };
  }),
);
const line = computed(() =>
  bars.value
    .filter((b) => b.budget > 0)
    .map((b) => `${b.cx},${b.cy}`)
    .join(' '),
);
</script>

<template>
  <div>
    <div class="relative">
      <!-- Skala seragam (bukan "none") supaya titik tetap bulat -->
      <svg
        :viewBox="`0 0 ${points.length * W} ${TOP + H + 8}`"
        class="block h-auto w-full"
        role="img"
        :aria-label="label"
      >
        <line
          x1="0"
          :x2="points.length * W"
          :y1="TOP + H"
          :y2="TOP + H"
          stroke="var(--sep)"
          vector-effect="non-scaling-stroke"
        />
        <rect
          v-for="b in bars"
          :key="`bar-${b.key}`"
          :x="b.x"
          :y="b.by"
          width="18"
          :height="b.h"
          rx="3"
          fill="var(--tone-red)"
          fill-opacity="0.45"
        />
        <polyline
          v-if="line"
          :points="line"
          fill="none"
          stroke="var(--tone-red)"
          stroke-width="3"
          stroke-linejoin="round"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <template v-for="b in bars" :key="`dot-${b.key}`">
          <circle
            v-if="b.budget > 0"
            :cx="b.cx"
            :cy="b.cy"
            :r="b.selected ? 5 : 3.5"
            :fill="b.selected ? 'var(--tone-red)' : 'var(--card)'"
            stroke="var(--tone-red)"
            stroke-width="2.5"
            vector-effect="non-scaling-stroke"
            class="budget-dot"
          />
        </template>
      </svg>
      <!-- Lapisan ketuk per kolom -->
      <div
        class="absolute inset-0 grid"
        :style="{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }"
      >
        <button
          v-for="b in bars"
          :key="b.key"
          type="button"
          :aria-label="`${b.label}: terpakai ${formatShort(b.spent)}${b.budget ? `, budget ${formatShort(b.budget)}` : ''}`"
          :aria-pressed="!!b.selected"
          class="rounded-[10px] active:bg-fill-press"
          @click="emit('pick', b.key)"
        />
      </div>
    </div>
    <div class="grid pt-0.5" :style="{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }">
      <span
        v-for="b in bars"
        :key="b.key"
        :class="[
          'text-center text-note',
          b.selected ? 'font-bold text-foreground' : 'font-medium',
          b.now && !b.selected ? 'text-exp' : !b.selected && 'text-muted-foreground',
        ]"
        >{{ b.label }}</span
      >
    </div>
    <div class="flex justify-center gap-3.5 pt-1.5 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-[5px]"
        ><i class="h-[3px] w-3.5 rounded-sm bg-[var(--tone-red)]" />Budget</span
      >
      <span class="inline-flex items-center gap-[5px]"
        ><i class="h-2.5 w-[9px] rounded-sm bg-[var(--tone-red)] opacity-45" />Terpakai</span
      >
    </div>
  </div>
</template>

<style scoped>
.budget-dot {
  transition: fill 200ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .budget-dot {
    transition: none;
  }
}
</style>
