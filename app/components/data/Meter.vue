<script setup lang="ts">
import { cn } from '@/lib/utils';
import { TONE_FILL, type Tone } from './tone';

// Batang kecil untuk progres (budget, porsi kategori). value 0–1.
const props = withDefaults(
  defineProps<{ value: number; tone?: Tone; label?: string; class?: string }>(),
  {
    tone: 'ok',
    label: undefined,
    class: '',
  },
);
const pct = computed(() => Math.min(1, Math.max(0, props.value)));
</script>

<template>
  <div
    role="meter"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(pct * 100)"
    :aria-label="props.label"
    :class="
      cn('h-1 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border', props.class)
    "
  >
    <span
      :class="[
        'block h-full origin-left rounded-full transition-transform duration-300 ease-out',
        TONE_FILL[props.tone],
      ]"
      :style="{ transform: `scaleX(${pct})` }"
    />
  </div>
</template>
