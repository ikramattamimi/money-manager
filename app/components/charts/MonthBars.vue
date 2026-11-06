<script setup lang="ts">
import { formatShort } from '@/lib/format';

// Batang per bulan dengan garis rata-rata putus-putus (mockup stats-category
// .chwrap/.colhits). Kolom bisa diketuk untuk pindah ke bulan itu; bulan
// terpilih berwarna penuh, lainnya pudar. Warna batang dari `color`.
const props = defineProps<{
  points: { key: string; label: string; value: number; current?: boolean }[];
  color: string;
  label: string;
}>();
const emit = defineEmits<{ pick: [key: string] }>();

const H = 120;
const max = computed(() => Math.max(1, ...props.points.map((p) => p.value)));
const avg = computed(() =>
  props.points.length ? props.points.reduce((s, p) => s + p.value, 0) / props.points.length : 0,
);
const bars = computed(() =>
  props.points.map((p) => {
    const h = p.value ? Math.max(3, (p.value / max.value) * H) : 0;
    return { ...p, h, y: 22 + H - h };
  }),
);
const avgY = computed(() => 22 + H - (avg.value / max.value) * H);
</script>

<template>
  <div class="relative">
    <svg
      :viewBox="`0 0 ${points.length * 60} 160`"
      class="block h-40 w-full"
      preserveAspectRatio="none"
      role="img"
      :aria-label="label"
    >
      <line
        x1="0"
        :x2="points.length * 60"
        :y1="avgY"
        :y2="avgY"
        stroke="var(--chevron)"
        stroke-dasharray="3 4"
        vector-effect="non-scaling-stroke"
      />
      <rect
        v-for="(b, i) in bars"
        :key="b.key"
        :x="i * 60 + 12"
        :y="b.y"
        width="36"
        :height="b.h"
        rx="6"
        :fill="color"
        :fill-opacity="b.current ? 1 : 0.35"
        class="month-bar"
      />
    </svg>
    <!-- Lapisan ketuk setinggi grafik saja (tanpa baris label) supaya posisi angka tepat -->
    <div
      class="absolute inset-x-0 top-0 grid h-40"
      :style="{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }"
    >
      <button
        v-for="b in bars"
        :key="b.key"
        type="button"
        :aria-label="`${b.label}: ${formatShort(b.value)}`"
        :aria-pressed="!!b.current"
        class="relative rounded-[10px] active:bg-fill-press"
        @click="emit('pick', b.key)"
      >
        <span
          class="absolute inset-x-0 text-center text-2xs font-semibold"
          :style="{ top: `${(Math.max(0, b.y - 18) / 160) * 100}%` }"
          aria-hidden="true"
          >{{ b.value ? formatShort(b.value, true) : '' }}</span
        >
      </button>
    </div>
    <div class="grid pt-1" :style="{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }">
      <span
        v-for="b in bars"
        :key="b.key"
        :class="[
          'text-center text-xs',
          b.current ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
        ]"
        >{{ b.label }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.month-bar {
  transition: fill-opacity 200ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .month-bar {
    transition: none;
  }
}
</style>
