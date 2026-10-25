<script setup lang="ts">
import { TONE_FILL, TREND_TONE } from '@/components/data/tone';
import { formatRupiah, formatShort } from '@/lib/format';

// Grafik batang per bulan (masuk/keluar). Tinggi batang lewat transform
// scaleY dengan pegas saat data berganti; reduce motion: cross-fade.
// Nominal ringkas di bawah tiap bulan, bulan aktif ditebalkan. Warna dari
// palet kategori (TREND_TONE) supaya senada dengan kartu per kategori.
// Tabel tersembunyi berisi nilai lengkap untuk pembaca layar.
export interface TrendPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
}
const props = withDefaults(
  defineProps<{
    points: TrendPoint[];
    label: string;
    show?: 'both' | 'income' | 'expense';
    /** Bulan yang dipilih; default bulan terakhir */
    activeKey?: string;
  }>(),
  { show: 'both', activeKey: undefined },
);

const active = computed(() => props.activeKey ?? props.points.at(-1)?.key);
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
const short = (v: number) => (v ? formatShort(v, true) : '0');
</script>

<template>
  <div>
    <div
      class="grid gap-1.5"
      :style="{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <div v-for="p in points" :key="p.key" class="flex min-w-0 flex-col items-center gap-1.5">
        <div class="flex h-28 w-full items-end justify-center gap-[3px]">
          <span
            v-if="show !== 'expense'"
            :class="[
              'trend-bar h-full w-2.5 max-w-[40%] rounded-t-[3px] rounded-b-[1px]',
              TONE_FILL[TREND_TONE.income],
              p.key !== active && 'opacity-70',
            ]"
            :style="{ transform: scale(p.income) }"
          />
          <span
            v-if="show !== 'income'"
            :class="[
              'trend-bar h-full w-2.5 max-w-[40%] rounded-t-[3px] rounded-b-[1px]',
              TONE_FILL[TREND_TONE.expense],
              p.key !== active && 'opacity-70',
            ]"
            :style="{ transform: scale(p.expense) }"
          />
        </div>
        <small
          :class="[
            'text-2xs',
            p.key === active ? 'font-bold text-foreground' : 'text-muted-foreground',
          ]"
          >{{ p.label }}</small
        >
        <!-- Nominal ringkas: masuk di atas, keluar di bawah. Teks netral supaya kontras
             cukup di mode terang; warnanya lewat kotak kecil di depan angka. -->
        <span
          :class="[
            'flex flex-col items-center text-[10px] leading-tight tabular-nums tracking-tight',
            p.key === active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
          ]"
        >
          <span v-if="show !== 'expense'" class="flex items-center gap-[3px]">
            <i :class="['size-1.5 rounded-[1px]', TONE_FILL[TREND_TONE.income]]" />{{
              short(p.income)
            }}
          </span>
          <span v-if="show !== 'income'" class="flex items-center gap-[3px]">
            <i :class="['size-1.5 rounded-[1px]', TONE_FILL[TREND_TONE.expense]]" />{{
              short(p.expense)
            }}
          </span>
        </span>
      </div>
    </div>
    <div class="mt-2.5 flex gap-3.5 text-xs text-muted-foreground" aria-hidden="true">
      <span v-if="show !== 'expense'" class="flex items-center gap-1.5">
        <i :class="['size-2 rounded-sm', TONE_FILL[TREND_TONE.income]]" />Masuk
      </span>
      <span v-if="show !== 'income'" class="flex items-center gap-1.5">
        <i :class="['size-2 rounded-sm', TONE_FILL[TREND_TONE.expense]]" />Keluar
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
  transition:
    transform 420ms var(--ease-spring),
    opacity 200ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .trend-bar {
    transition: opacity 200ms ease-out;
  }
}
</style>
