<script setup lang="ts">
import { IOS_TONE, type Tone } from '@/components/data/tone';

// Donat komposisi (mockup .donut): cincin 32px, irisan dari nada kategori,
// total di tengah. Irisan < 0,5% tetap digambar tipis supaya tidak hilang.
// Warna dari token nada (terang/gelap), urutan searah jarum jam dari atas.
const props = defineProps<{
  slices: { key: string; value: number; tone: Tone }[];
  label: string;
  caption: string;
  total: string;
}>();

const R = 78;
const C = 2 * Math.PI * R;
const arcs = computed(() => {
  const sum = props.slices.reduce((s, x) => s + x.value, 0);
  if (!sum) return [];
  let offset = 0;
  return props.slices.map((s) => {
    const len = Math.max((s.value / sum) * C, 1.5);
    const arc = {
      key: s.key,
      color: `var(--tone-${IOS_TONE[s.tone]})`,
      dash: `${len} ${C - len}`,
      offset: -offset,
    };
    offset += (s.value / sum) * C;
    return arc;
  });
});
</script>

<template>
  <div class="relative flex justify-center bg-card pb-2 pt-[18px]">
    <svg width="230" height="230" viewBox="0 0 230 230" role="img" :aria-label="label">
      <circle cx="115" cy="115" :r="R" fill="none" stroke="var(--fill)" stroke-width="32" />
      <circle
        v-for="a in arcs"
        :key="a.key"
        cx="115"
        cy="115"
        :r="R"
        fill="none"
        :stroke="a.color"
        stroke-width="32"
        :stroke-dasharray="a.dash"
        :stroke-dashoffset="a.offset"
        transform="rotate(-90 115 115)"
      />
    </svg>
    <div
      class="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-[44%] flex-col items-center gap-px text-center"
      aria-hidden="true"
    >
      <small class="text-xs text-muted-foreground">{{ caption }}</small>
      <b class="text-sheet font-bold tracking-[-0.02em]">{{ total }}</b>
    </div>
  </div>
</template>
