<script setup lang="ts">
import YearScroller from '@/components/charts/YearScroller.vue';
import { formatShort } from '@/lib/format';

// Batang per bulan dalam satu tahun, bisa digeser dan diketuk. Kolom lebar
// tetap (COL px) supaya angka tiap bulan selalu terbaca; bulan terpilih
// berwarna penuh dengan sorot lembut, lainnya pudar. Garis rata-rata
// putus-putus melintang. Bulan tanpa data punya tanda tipis di dasar.
// Menarik melewati ujung pindah tahun (lihat YearScroller).
const props = defineProps<{
  year: number;
  canPrev: boolean;
  canNext: boolean;
  points: { key: string; label: string; value: number; current?: boolean }[];
  color: string;
  label: string;
  loading?: boolean;
}>();
const emit = defineEmits<{ pick: [key: string]; year: [delta: 1 | -1] }>();

const COL = 56;
const H = 108; // tinggi area batang
const TOP = 22; // ruang angka di atas batang terpanjang
const FOOT = 22; // baris label bulan
const max = computed(() => Math.max(1, ...props.points.map((p) => p.value)));
const avg = computed(() =>
  props.points.length ? props.points.reduce((s, p) => s + p.value, 0) / props.points.length : 0,
);
const bars = computed(() =>
  props.points.map((p) => ({ ...p, h: p.value ? Math.max(4, (p.value / max.value) * H) : 3 })),
);
const active = computed(() => props.points.findIndex((p) => p.current));
</script>

<template>
  <div>
    <YearScroller
    :year="year"
    :count="points.length"
    :active="active"
    :col="COL"
    :can-prev="canPrev"
    :can-next="canNext"
    @year="(d) => emit('year', d)"
  >
    <div
      :class="['relative transition-opacity duration-200', loading && 'opacity-60']"
      :style="{ width: `${points.length * COL}px`, height: `${TOP + H + FOOT}px` }"
      role="group"
      :aria-label="label"
    >
      <div
        class="absolute inset-x-0 border-t"
        :style="{ bottom: `${FOOT}px`, borderColor: 'var(--sep)' }"
        aria-hidden="true"
      />
      <div
        v-if="avg"
        class="pointer-events-none absolute inset-x-0 z-[1] border-t-2 border-dotted border-muted-foreground/60"
        :style="{ bottom: `${FOOT + (avg / max) * H}px` }"
        aria-hidden="true"
      />
      <div class="absolute inset-0 flex">
        <button
          v-for="b in bars"
          :key="b.key"
          type="button"
          :aria-label="`${b.label} ${year}: ${formatShort(b.value)}`"
          :aria-pressed="!!b.current"
          :class="[
            'relative shrink-0 rounded-[10px] transition-colors duration-150 active:bg-fill-press',
            b.current && 'bg-fill',
          ]"
          :style="{ width: `${COL}px` }"
          @click="emit('pick', b.key)"
        >
          <span
            :class="[
              'absolute inset-x-0 text-center text-2xs tabular-nums',
              b.current ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground',
            ]"
            :style="{ bottom: `${FOOT + b.h + 4}px` }"
            aria-hidden="true"
            >{{ b.value ? formatShort(b.value, true) : '' }}</span
          >
          <span
            class="month-bar absolute left-1/2 w-[30px] -translate-x-1/2 rounded-[7px]"
            :style="{
              bottom: `${FOOT}px`,
              height: `${b.h}px`,
              background: b.value ? color : 'var(--fill)',
              opacity: b.current || !b.value ? 1 : 0.35,
            }"
            aria-hidden="true"
          />
          <span
            :class="[
              'absolute inset-x-0 bottom-0 flex items-center justify-center text-xs',
              b.current ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
            ]"
            :style="{ height: `${FOOT}px` }"
            aria-hidden="true"
            >{{ b.label }}</span
          >
        </button>
      </div>
    </div>
    </YearScroller>
    <div
      v-if="avg"
      class="flex items-center justify-center gap-[5px] pt-2 text-xs text-muted-foreground"
    >
      <i class="w-3.5 border-t-2 border-dotted border-muted-foreground/60" />Rata-rata
      <span class="tabular-nums">{{ formatShort(Math.round(avg)) }}</span>
    </div>
  </div>
</template>

<style scoped>
.month-bar {
  transition: opacity 200ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .month-bar {
    transition: none;
  }
}
</style>
