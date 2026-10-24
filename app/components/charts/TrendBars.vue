<script setup lang="ts">
import { formatRupiah } from '@/lib/format';

// Grafik batang per bulan (masuk/keluar). Tinggi batang lewat transform
// scaleY dengan pegas saat data berganti; reduce motion: cross-fade.
// Tabel tersembunyi untuk pembaca layar.
export interface TrendPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
}
const props = withDefaults(
  defineProps<{ points: TrendPoint[]; label: string; show?: 'both' | 'income' | 'expense' }>(),
  { show: 'both' },
);

const max = computed(() =>
  Math.max(
    1,
    ...props.points.flatMap((p) =>
      props.show === 'income'
        ? [p.income]
        : props.show === 'expense'
          ? [p.expense]
          : [p.income, p.expense],
    ),
  ),
);
const scale = (v: number) => `scaleY(${Math.max(v / max.value, v ? 0.02 : 0)})`;
</script>

<template>
  <div>
    <div
      class="grid h-30 items-end gap-2"
      :style="{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <div
        v-for="p in points"
        :key="p.key"
        class="flex h-full flex-col items-center justify-end gap-1.5"
      >
        <div class="flex h-full w-full items-end justify-center gap-[3px]">
          <span
            v-if="show !== 'expense'"
            class="trend-bar h-full w-2.5 max-w-[40%] rounded-t-[3px] rounded-b-[1px] bg-primary-accent"
            :style="{ transform: scale(p.income) }"
          />
          <span
            v-if="show !== 'income'"
            class="trend-bar h-full w-2.5 max-w-[40%] rounded-t-[3px] rounded-b-[1px] bg-bad/85"
            :style="{ transform: scale(p.expense) }"
          />
        </div>
        <small class="text-2xs text-muted-foreground">{{ p.label }}</small>
      </div>
    </div>
    <div class="mt-2.5 flex gap-3.5 text-xs text-muted-foreground" aria-hidden="true">
      <span v-if="show !== 'expense'" class="flex items-center gap-1.5">
        <i class="size-2 rounded-sm bg-primary-accent" />Masuk
      </span>
      <span v-if="show !== 'income'" class="flex items-center gap-1.5">
        <i class="size-2 rounded-sm bg-bad" />Keluar
      </span>
    </div>
    <table class="sr-only">
      <caption>
        {{
          label
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Bulan</th>
          <th v-if="show !== 'expense'" scope="col">Masuk</th>
          <th v-if="show !== 'income'" scope="col">Keluar</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in points" :key="p.key">
          <th scope="row">{{ p.label }}</th>
          <td v-if="show !== 'expense'">{{ formatRupiah(p.income) }}</td>
          <td v-if="show !== 'income'">{{ formatRupiah(p.expense) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.trend-bar {
  transform-origin: bottom;
  transition: transform 420ms var(--ease-spring);
}
@media (prefers-reduced-motion: reduce) {
  .trend-bar {
    transition: opacity 200ms ease-out;
  }
}
</style>
