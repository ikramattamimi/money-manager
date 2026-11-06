<script setup lang="ts">
import YearScroller from '@/components/charts/YearScroller.vue';
import { formatShort } from '@/lib/format';

// Grafik rincian budget, gerak dan gestur sama dengan grafik kategori
// (LineTrend): kolom lebar tetap yang bisa digeser dan diketuk, menarik
// melewati ujung pindah tahun (YearScroller), titik terpilih berlubang yang
// meluncur ke kolom baru, tinggi batang dan posisi garis meluncur saat data
// berganti (useTweened), tekan/hover kolom berupa latar translusen.
// Batang pengeluaran per bulan (yang melewati budget berwarna penuh, yang
// masih aman lebih pudar) dan garis budget tebal dengan nominal di tiap
// titik. Bulan berjalan labelnya merah.
const props = defineProps<{
  year: number;
  canPrev: boolean;
  canNext: boolean;
  points: {
    key: string;
    label: string;
    spent: number;
    budget: number;
    selected?: boolean;
    now?: boolean;
  }[];
  label: string;
  loading?: boolean;
}>();
const emit = defineEmits<{ pick: [key: string]; year: [delta: 1 | -1] }>();

const COL = 64;
const H = 100; // tinggi area batang dan garis
const TOP = 30; // ruang nominal budget di atas titik tertinggi
const FOOT = 26; // baris label bulan
const tween = useTweened(() => props.points.flatMap((p) => [p.spent, p.budget]));
const max = computed(() => Math.max(1, ...tween.value));
const y = (v: number) => TOP + H - (v / max.value) * H;
const cols = computed(() =>
  props.points.map((p, i) => {
    const spent = tween.value[i * 2] ?? 0;
    const budget = tween.value[i * 2 + 1] ?? 0;
    const h = spent > 0.5 ? Math.max(3, (spent / max.value) * H) : 0;
    return {
      ...p,
      x: i * COL + (COL - 18) / 2,
      h,
      by: TOP + H - h,
      cx: i * COL + COL / 2,
      cy: y(budget),
      over: p.budget > 0 && p.spent > p.budget,
    };
  }),
);
const line = computed(() =>
  cols.value
    .filter((c) => c.budget > 0)
    .map((c) => `${c.cx},${c.cy}`)
    .join(' '),
);
const active = computed(() => cols.value.find((c) => c.selected && c.budget > 0));
const activeIndex = computed(() => props.points.findIndex((p) => p.selected));
const fmt = (v: number) => v.toLocaleString('id-ID');
const width = computed(() => props.points.length * COL);
const height = TOP + H + FOOT;
</script>

<template>
  <div>
    <YearScroller
      :year="year"
      :count="points.length"
      :active="activeIndex"
      :col="COL"
      :can-prev="canPrev"
      :can-next="canNext"
      @year="(d) => emit('year', d)"
    >
      <div
        :class="['relative transition-opacity duration-200', loading && 'opacity-60']"
        :style="{ width: `${width}px`, height: `${height}px` }"
        role="group"
        :aria-label="label"
      >
        <svg :width="width" :height="TOP + H" class="absolute left-0 top-0" aria-hidden="true">
          <line :x1="0" :x2="width" :y1="TOP + H" :y2="TOP + H" stroke="var(--sep)" />
          <rect
            v-for="c in cols"
            :key="`bar-${c.key}`"
            class="budget-bar"
            :x="c.x"
            :y="c.by"
            width="18"
            :height="c.h"
            rx="2"
            fill="var(--tone-red)"
            :fill-opacity="c.over ? 0.95 : 0.55"
          />
          <polyline
            v-if="line"
            :points="line"
            fill="none"
            stroke="var(--tone-red)"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <template v-for="c in cols" :key="`dot-${c.key}`">
            <circle v-if="c.budget > 0" :cx="c.cx" :cy="c.cy" r="5.5" fill="var(--tone-red)" />
          </template>
        </svg>
        <!-- Titik terpilih: berlubang, meluncur ke titik baru. Titik penuh tidak
             disembunyikan (menutupi kekosongan saat meluncur); titik berlubang yang
             berlatar kartu menutupinya begitu tiba. -->
        <i
          v-if="active"
          class="budget-sel pointer-events-none absolute left-0 top-0 size-[14px] rounded-full border-[3.5px] border-[var(--tone-red)] bg-card"
          :style="{ transform: `translate(${active.cx - 7}px, ${active.cy - 7}px)` }"
          aria-hidden="true"
        />
        <div class="absolute inset-0 flex">
          <button
            v-for="c in cols"
            :key="c.key"
            type="button"
            :aria-label="`${c.label} ${year}: terpakai ${formatShort(c.spent)}${c.budget ? `, budget ${formatShort(c.budget)}` : ''}${c.over ? ', melebihi budget' : ''}`"
            :aria-pressed="!!c.selected"
            class="relative shrink-0 rounded-[10px] transition-colors duration-150 hover:bg-[var(--glass-press)] active:bg-[var(--glass-press)]"
            :style="{ width: `${COL}px` }"
            @click="emit('pick', c.key)"
          >
            <span
              v-if="c.budget > 0"
              :class="[
                'budget-val absolute left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap pb-2 text-[10px] tabular-nums',
                c.selected ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
              ]"
              :style="{ top: `${c.cy}px` }"
              aria-hidden="true"
              >{{ fmt(c.budget) }}</span
            >
            <span
              :class="[
                'budget-label absolute inset-x-0 bottom-0 flex items-center justify-center text-note',
                c.selected ? 'font-bold text-foreground' : 'font-medium',
                c.now && !c.selected ? 'text-exp' : !c.selected && 'text-muted-foreground',
              ]"
              :style="{ height: `${FOOT}px` }"
              aria-hidden="true"
              >{{ c.label }}</span
            >
          </button>
        </div>
      </div>
    </YearScroller>
    <div class="flex justify-center gap-3.5 pt-1.5 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-[5px]"
        ><i class="h-[3px] w-3.5 rounded-sm bg-[var(--tone-red)]" />Budget</span
      >
      <span class="inline-flex items-center gap-[5px]"
        ><i class="h-2.5 w-[9px] rounded-sm bg-[var(--tone-red)] opacity-55" />Terpakai</span
      >
      <span class="inline-flex items-center gap-[5px]"
        ><i class="h-2.5 w-[9px] rounded-sm bg-[var(--tone-red)] opacity-95" />Melebihi</span
      >
    </div>
  </div>
</template>

<style scoped>
/* Titik berlubang meluncur dengan kurva drawer; hanya transform */
.budget-sel {
  transition: transform 300ms var(--ease-drawer);
}
.budget-bar {
  transition: fill-opacity 200ms ease;
}
.budget-val,
.budget-label {
  transition: color 200ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .budget-sel,
  .budget-bar,
  .budget-val,
  .budget-label {
    transition: none;
  }
}
</style>
