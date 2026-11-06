<script setup lang="ts">
import { formatShort } from '@/lib/format';

// Tren aset bersih 6 bulan di halaman Akun (mockup .grp sparkline): garis
// aksen 2,5px dengan titik per bulan, label bulan di bawah, perubahan sejak
// bulan pertama di kanan atas (naik hijau, turun merah). Garis direntang
// selebar kartu (non-scaling stroke); titik digambar sebagai elemen HTML
// supaya tetap bulat. Tanpa animasi: data, bukan hiasan.
const props = defineProps<{
  points: readonly { key: string; label: string; value: number }[];
  /** Kunci titik bulan terpilih (labelnya ditebalkan) */
  current?: string;
  /** Teks pengganti kalau data tidak tersedia */
  note?: string;
}>();

const W = 600;
const H = 70;
const coords = computed(() => {
  const values = props.points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const n = props.points.length || 1;
  return props.points.map((p, k) => ({
    ...p,
    x: ((k + 0.5) / n) * W,
    y: Math.round(60 - ((p.value - lo) / (hi - lo || 1)) * 50),
  }));
});
const line = computed(() => coords.value.map((c) => `${c.x},${c.y}`).join(' '));
const diff = computed(() =>
  props.points.length > 1 ? props.points.at(-1)!.value - props.points[0]!.value : 0,
);
const summary = computed(() =>
  props.points.map((p) => `${p.label} ${formatShort(p.value)}`).join(', '),
);
</script>

<template>
  <section class="mx-4 mt-3.5 rounded-group bg-card px-4 pb-2.5 pt-3">
    <div class="flex items-baseline justify-between gap-3">
      <b class="text-body font-bold tracking-[-0.01em]">Tren aset bersih</b>
      <span
        v-if="!note && points.length > 1"
        :class="['text-meta font-semibold', diff >= 0 ? 'text-ok' : 'text-exp']"
      >
        {{ diff >= 0 ? '▲' : '▼' }} {{ formatShort(Math.abs(diff)) }} / {{ points.length }} bln
      </span>
    </div>
    <p v-if="note" class="m-0 py-3 text-meta text-muted-foreground">{{ note }}</p>
    <template v-else-if="points.length">
      <div
        class="relative mt-1 h-[70px]"
        role="img"
        :aria-label="`Aset bersih ${points.length} bulan terakhir: ${summary}`"
      >
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="none"
          class="absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          <polyline
            :points="line"
            fill="none"
            stroke="var(--primary-accent)"
            stroke-width="2.5"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <span
          v-for="c in coords"
          :key="c.key"
          class="absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-accent bg-card"
          :style="{ left: `${(c.x / W) * 100}%`, top: `${(c.y / H) * 100}%` }"
          aria-hidden="true"
        />
      </div>
      <div
        class="grid text-center text-2xs text-muted-foreground"
        :style="{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }"
        aria-hidden="true"
      >
        <span
          v-for="p in points"
          :key="p.key"
          :class="p.key === current && 'font-semibold text-foreground'"
          >{{ p.label }}</span
        >
      </div>
    </template>
  </section>
</template>
