<script setup lang="ts">
import { TONE_FILL, type Tone } from '@/components/data/tone';

// Batang bertumpuk 100% + legenda persen dan nilai (Opnamix CompositionBar)
export interface CompositionPart {
  key: string;
  label: string;
  value: number;
  display: string;
  tone: Tone;
}
const props = defineProps<{ parts: CompositionPart[]; label: string }>();

const total = computed(() => props.parts.reduce((sum, p) => sum + p.value, 0));
const pct = (v: number) => (total.value ? Math.round((v / total.value) * 100) : 0);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      role="img"
      :aria-label="`${label}: ${parts.map((p) => `${p.label} ${pct(p.value)}%`).join(', ')}`"
      class="flex h-3 gap-0.5 overflow-hidden rounded-full"
    >
      <span
        v-for="p in parts"
        :key="p.key"
        :class="['h-full', TONE_FILL[p.tone]]"
        :style="{ flex: p.value }"
      />
    </div>
    <div
      class="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 gap-y-2 text-meta"
    >
      <template v-for="p in parts" :key="p.key">
        <i :class="['size-2 rounded-sm', TONE_FILL[p.tone]]" aria-hidden="true" />
        <span class="truncate">{{ p.label }}</span>
        <small class="text-xs tabular-nums text-muted-foreground">{{ pct(p.value) }}%</small>
        <b class="text-right font-semibold tabular-nums">{{ p.display }}</b>
      </template>
    </div>
  </div>
</template>
