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
const props = defineProps<{ parts: CompositionPart[]; label: string; selectable?: boolean }>();
const emit = defineEmits<{ select: [key: string] }>();

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
      :class="[
        'grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 text-meta',
        selectable ? 'gap-y-0.5' : 'gap-y-2',
      ]"
    >
      <component
        :is="selectable ? 'button' : 'div'"
        v-for="p in parts"
        :key="p.key"
        :type="selectable ? 'button' : undefined"
        :class="[
          'col-span-4 grid grid-cols-subgrid items-center text-left',
          selectable &&
            'press -mx-1.5 rounded-lg px-1.5 py-1 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ]"
        @click="selectable && emit('select', p.key)"
      >
        <i :class="['size-2 rounded-sm', TONE_FILL[p.tone]]" aria-hidden="true" />
        <span class="truncate">{{ p.label }}</span>
        <small class="text-xs tabular-nums text-muted-foreground">{{ pct(p.value) }}%</small>
        <b class="text-right font-semibold tabular-nums">{{ p.display }}</b>
      </component>
    </div>
  </div>
</template>
