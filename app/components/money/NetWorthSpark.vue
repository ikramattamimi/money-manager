<script setup lang="ts">
import YearScroller from '@/components/charts/YearScroller.vue';
import { formatShort } from '@/lib/format';

// Tren aset bersih per tahun di halaman Akun: garis aksen polos (tanpa area
// gradien), angka tiap bulan di atas titik, bisa digeser dan diketuk (pindah
// ke bulan itu). Tahun berjalan hanya sampai bulan ini; tarik melewati ujung
// pindah tahun. Bulan terpilih ditandai titiknya saja (lebih besar, penuh),
// tanpa latar atau bayangan. Perubahan sepanjang tahun yang tampil di kanan atas (naik
// hijau, turun merah). Tanpa animasi masuk: data, bukan hiasan.
const props = defineProps<{
  year: number;
  canPrev: boolean;
  canNext: boolean;
  points: readonly { key: string; label: string; value: number }[];
  /** Kunci titik bulan terpilih */
  current?: string;
  /** Judul kartu; berganti nama total saat satu total dipilih */
  title?: string;
  /** Teks pengganti kalau data tidak tersedia */
  note?: string;
  loading?: boolean;
}>();
const emit = defineEmits<{ pick: [key: string]; year: [delta: 1 | -1] }>();

const COL = 60;
const H = 150;
const FOOT = 22; // baris label bulan
const PLOT_TOP = 36; // ruang angka di atas titik tertinggi
const PLOT_BOTTOM = H - FOOT - 14;
const W = computed(() => props.points.length * COL);

const coords = computed(() => {
  const values = props.points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return props.points.map((p, k) => ({
    ...p,
    x: k * COL + COL / 2,
    y: PLOT_BOTTOM - ((p.value - lo) / (hi - lo || 1)) * (PLOT_BOTTOM - PLOT_TOP),
    col: k * COL,
    selected: p.key === props.current,
  }));
});
const line = computed(() => coords.value.map((c) => `${c.x},${c.y}`).join(' '));
const active = computed(() => props.points.findIndex((p) => p.key === props.current));
const diff = computed(() =>
  props.points.length > 1 ? props.points.at(-1)!.value - props.points[0]!.value : 0,
);
const summary = computed(() =>
  props.points.map((p) => `${p.label} ${formatShort(p.value)}`).join(', '),
);
</script>

<template>
  <section class="mx-4 mt-3.5 rounded-group bg-card px-3 pb-2.5 pt-3">
    <div class="flex items-baseline justify-between gap-3 px-1">
      <b class="min-w-0 truncate text-label font-bold tracking-[-0.01em]">{{
        title ?? 'Tren aset bersih'
      }}</b>
      <span
        v-if="!note && points.length > 1"
        :class="['shrink-0 text-note font-semibold', diff >= 0 ? 'text-ok' : 'text-exp']"
      >
        {{ diff >= 0 ? '▲' : '▼' }} {{ formatShort(Math.abs(diff)) }} / {{ points.length }} bln
      </span>
    </div>
    <p v-if="note" class="m-0 px-1 py-3 text-note text-muted-foreground">{{ note }}</p>
    <YearScroller
      v-else
      class="mt-1"
      :year="year"
      :count="points.length"
      :active="active"
      :col="COL"
      :can-prev="canPrev"
      :can-next="canNext"
      @year="(d) => emit('year', d)"
    >
      <p v-if="!points.length" class="m-0 px-1 py-6 text-center text-note text-muted-foreground">
        Belum ada data di {{ year }}.
      </p>
      <div
        v-else
        :class="['relative transition-opacity duration-200', loading && 'opacity-60']"
        :style="{ width: `${W}px`, height: `${H}px` }"
        role="group"
        :aria-label="`Aset bersih ${year}: ${summary}`"
      >
        <svg :width="W" :height="H" class="absolute inset-0" aria-hidden="true">
          <line x1="0" :x2="W" :y1="H - FOOT" :y2="H - FOOT" stroke="var(--sep)" stroke-width="1" />
          <polyline
            :points="line"
            fill="none"
            stroke="var(--primary-accent)"
            stroke-width="2.5"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
        <div class="absolute inset-0 flex">
          <button
            v-for="c in coords"
            :key="c.key"
            type="button"
            :aria-label="`${c.label} ${year}: ${formatShort(c.value)}`"
            :aria-pressed="c.selected"
            :class="[
              'relative shrink-0 rounded-[10px] transition-colors duration-150 active:bg-[var(--glass-press)]',
            ]"
            :style="{ width: `${COL}px` }"
            @click="emit('pick', c.key)"
          >
            <span
              :class="[
                'absolute inset-x-0 text-center text-2xs tabular-nums',
                c.selected ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground',
              ]"
              :style="{ top: `${c.y - 22}px` }"
              aria-hidden="true"
              >{{ formatShort(c.value, true) }}</span
            >
            <span
              :class="[
                'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-accent transition-[width,height,background-color] duration-150',
                c.selected ? 'size-3 bg-primary-accent' : 'size-2 bg-card',
              ]"
              :style="{ top: `${c.y}px` }"
              aria-hidden="true"
            />
            <span
              :class="[
                'absolute inset-x-0 bottom-0 flex items-center justify-center text-2xs',
                c.selected ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
              ]"
              :style="{ height: `${FOOT}px` }"
              aria-hidden="true"
              >{{ c.label }}</span
            >
          </button>
        </div>
      </div>
    </YearScroller>
  </section>
</template>
