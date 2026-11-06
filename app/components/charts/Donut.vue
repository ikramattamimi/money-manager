<script setup lang="ts">
import { IOS_TONE, type Tone } from '@/components/data/tone';

// Donat komposisi tebal: irisan dari nada kategori dengan jeda tipis, searah
// jarum jam dari atas. Irisan bisa diketuk: yang dipilih tetap terang, sisanya
// memudar, dan bagian tengah berganti dari total menjadi nama, nominal, dan
// persen irisan itu. Ketuk lagi (atau ketuk di luar irisan) untuk membatalkan.
// Daftar kategori di bawah chart adalah jalur yang bisa diakses keyboard.
const props = defineProps<{
  slices: { key: string; value: number; tone: Tone; name: string; display: string }[];
  label: string;
  caption: string;
  total: string;
  selected?: string | null;
}>();
const emit = defineEmits<{ select: [key: string | null] }>();

const SIZE = 236;
const STROKE = 38;
const R = (SIZE - STROKE) / 2 - 2;
const C = 2 * Math.PI * R;
const GAP = 2;
const sum = computed(() => props.slices.reduce((s, x) => s + x.value, 0));
const arcs = computed(() => {
  if (!sum.value) return [];
  const single = props.slices.length === 1;
  let offset = 0;
  return props.slices.map((s) => {
    const share = (s.value / sum.value) * C;
    // Irisan tunggal: lingkaran penuh tanpa jeda; irisan kecil tetap terlihat
    const len = single ? C : Math.max(share - GAP, 1.5);
    const arc = {
      key: s.key,
      color: `var(--tone-${IOS_TONE[s.tone]})`,
      dash: `${len} ${C - len}`,
      offset: -(offset + (single ? 0 : GAP / 2)),
    };
    offset += share;
    return arc;
  });
});
const picked = computed(() => props.slices.find((s) => s.key === props.selected) ?? null);
const pickedPct = computed(() =>
  picked.value && sum.value ? Math.round((picked.value.value / sum.value) * 100) : 0,
);
const toggle = (key: string) => emit('select', props.selected === key ? null : key);
</script>

<template>
  <div class="relative flex justify-center bg-card pb-3 pt-5">
    <svg
      :width="SIZE"
      :height="SIZE"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      role="img"
      :aria-label="label"
      @click.self="emit('select', null)"
    >
      <g :transform="`rotate(-90 ${SIZE / 2} ${SIZE / 2})`" @click.self="emit('select', null)">
        <circle
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="R"
          fill="none"
          stroke="var(--fill)"
          :stroke-width="STROKE"
          @click="emit('select', null)"
        />
        <circle
          v-for="a in arcs"
          :key="a.key"
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="R"
          fill="none"
          :stroke="a.color"
          :stroke-width="STROKE"
          :stroke-dasharray="a.dash"
          :stroke-dashoffset="a.offset"
          :opacity="!selected || selected === a.key ? 1 : 0.3"
          class="donut-arc cursor-pointer"
          aria-hidden="true"
          @click="toggle(a.key)"
        />
      </g>
    </svg>
    <div
      class="pointer-events-none absolute left-1/2 top-1/2 flex w-[130px] -translate-x-1/2 -translate-y-[46%] flex-col items-center gap-0.5 text-center"
      aria-hidden="true"
    >
      <template v-if="picked">
        <small class="max-w-full truncate text-xs font-medium text-muted-foreground">{{
          picked.name
        }}</small>
        <b class="text-sheet font-bold tabular-nums tracking-[-0.02em]">{{ picked.display }}</b>
        <small class="text-xs font-semibold tabular-nums text-muted-foreground"
          >{{ pickedPct }}%</small
        >
      </template>
      <template v-else>
        <small class="text-xs font-medium text-muted-foreground">{{ caption }}</small>
        <b class="text-sheet font-bold tabular-nums tracking-[-0.02em]">{{ total }}</b>
      </template>
    </div>
  </div>
</template>

<style scoped>
.donut-arc {
  transition: opacity 150ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .donut-arc {
    transition: none;
  }
}
</style>
