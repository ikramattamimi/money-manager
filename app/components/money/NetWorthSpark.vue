<script setup lang="ts">
import YearScroller from '@/components/charts/YearScroller.vue';
import { formatShort } from '@/lib/format';

// Tren aset bersih per tahun di halaman Akun: garis aksen dengan area
// gradien, angka tiap bulan di atas titik, bisa digeser dan diketuk (pindah
// ke bulan itu). Tahun berjalan hanya sampai bulan ini; tarik melewati ujung
// pindah tahun. Perubahan sepanjang tahun yang tampil di kanan atas (naik
// hijau, turun merah). Tanpa animasi masuk: data, bukan hiasan.
const props = defineProps<{
  year: number;
  canPrev: boolean;
  canNext: boolean;
  points: readonly { key: string; label: string; value: number }[];
  /** Kunci titik bulan terpilih */
  current?: string;
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
const gid = `nw-${useId()}`;

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
const area = computed(() =>
  coords.value.length
    ? `${coords.value[0]!.x},${H - FOOT} ${line.value} ${coords.value.at(-1)!.x},${H - FOOT}`
    : '',
);
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
      <b class="text-label font-bold tracking-[-0.01em]">Tren aset bersih</b>
      <span
        v-if="!note && points.length > 1"
        :class="['text-note font-semibold', diff >= 0 ? 'text-ok' : 'text-exp']"
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
          <defs>
            <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="var(--primary-accent)" stop-opacity="0.22" />
              <stop offset="1" stop-color="var(--primary-accent)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            :x2="W"
            :y1="H - FOOT"
            :y2="H - FOOT"
            stroke="var(--sep)"
            stroke-width="1"
          />
          <polygon v-if="coords.length > 1" :points="area" :fill="`url(#${gid})`" />
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
              'relative shrink-0 rounded-[10px] transition-colors duration-150 active:bg-fill-press',
              c.selected && 'bg-fill/70',
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
                c.selected
                  ? 'size-3 bg-primary-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary-accent)_18%,transparent)]'
                  : 'size-2 bg-card',
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
