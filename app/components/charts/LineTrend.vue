<script setup lang="ts">
import YearScroller from '@/components/charts/YearScroller.vue';

// Grafik garis bulanan gaya Realbyte untuk rincian kategori: satu garis tebal
// dengan titik, nominal di atas tiap titik, nama bulan di bawah. Kolom lebar
// tetap (COL px), bisa digeser dan diketuk; menarik melewati ujung pindah
// tahun (lihat YearScroller). Bulan terpilih: titik berlubang yang meluncur
// di sepanjang garis ke titik baru, nominal dan label menebal; bulan
// berjalan labelnya merah. Garis meluncur saat data berganti (useTweened).
// Tabel tersembunyi berisi nilai untuk pembaca layar.
const props = defineProps<{
  year: number;
  canPrev: boolean;
  canNext: boolean;
  points: { key: string; label: string; value: number; current?: boolean; now?: boolean }[];
  /** Warna garis (nilai CSS, mis. var(--tone-blue)) */
  color: string;
  label: string;
  loading?: boolean;
}>();
const emit = defineEmits<{ pick: [key: string]; year: [delta: 1 | -1] }>();

const COL = 64;
const H = 100; // tinggi area garis
const TOP = 30; // ruang nominal di atas titik tertinggi
const FOOT = 26; // baris label bulan
const BOT = 8; // jarak titik terendah ke garis dasar
const tween = useTweened(() => props.points.map((p) => p.value));
const max = computed(() => Math.max(1, ...tween.value));
const y = (v: number) => TOP + H - BOT - (v / max.value) * (H - BOT);
const cols = computed(() =>
  props.points.map((p, i) => ({
    ...p,
    cx: i * COL + COL / 2,
    cy: y(tween.value[i] ?? 0),
  })),
);
const line = computed(() => cols.value.map((c) => `${c.cx},${c.cy}`).join(' '));
const active = computed(() => cols.value.find((c) => c.current));
const active1 = computed(() => props.points.findIndex((p) => p.current));
const fmt = (v: number) => (v ? v.toLocaleString('id-ID') : '0');
const width = computed(() => props.points.length * COL);
const height = TOP + H + FOOT;
</script>

<template>
  <YearScroller
    :year="year"
    :count="points.length"
    :active="active1"
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
        <polyline
          v-if="points.length > 1"
          :points="line"
          fill="none"
          :stroke="color"
          stroke-width="4"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle v-for="c in cols" :key="c.key" :cx="c.cx" :cy="c.cy" r="5.5" :fill="color" />
      </svg>
      <!-- Titik terpilih: berlubang, meluncur ke titik baru -->
      <i
        v-if="active"
        class="line-sel pointer-events-none absolute left-0 top-0 size-[14px] rounded-full border-[3.5px] bg-card"
        :style="{
          transform: `translate(${active.cx - 7}px, ${active.cy - 7}px)`,
          borderColor: color,
        }"
        aria-hidden="true"
      />
      <div class="absolute inset-0 flex">
        <button
          v-for="c in cols"
          :key="c.key"
          type="button"
          :aria-label="`${c.label} ${year}: ${fmt(c.value)}`"
          :aria-pressed="!!c.current"
          class="relative shrink-0 rounded-[10px] transition-colors duration-150 hover:bg-[var(--glass-press)] active:bg-[var(--glass-press)]"
          :style="{ width: `${COL}px` }"
          @click="emit('pick', c.key)"
        >
          <span
            :class="[
              'line-val absolute left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap pb-2 text-[10px] tabular-nums',
              c.current ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
            ]"
            :style="{ top: `${c.cy}px` }"
            aria-hidden="true"
            >{{ c.value ? fmt(c.value) : '' }}</span
          >
          <span
            :class="[
              'line-label absolute inset-x-0 bottom-0 flex items-center justify-center text-note',
              c.current ? 'font-bold text-foreground' : 'font-medium',
              c.now && !c.current ? 'text-exp' : !c.current && 'text-muted-foreground',
            ]"
            :style="{ height: `${FOOT}px` }"
            aria-hidden="true"
            >{{ c.label }}</span
          >
        </button>
      </div>
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
          <th scope="col">Nominal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in points" :key="p.key">
          <th scope="row">{{ p.label }}</th>
          <td>Rp {{ fmt(p.value) }}</td>
        </tr>
      </tbody>
    </table>
  </YearScroller>
</template>

<style scoped>
/* Titik berlubang meluncur dengan kurva drawer; hanya transform */
.line-sel {
  transition: transform 300ms var(--ease-drawer);
}
.line-val,
.line-label {
  transition: color 200ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .line-sel,
  .line-val,
  .line-label {
    transition: none;
  }
}
</style>
