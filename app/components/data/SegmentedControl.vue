<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue';
import { cn } from '@/lib/utils';

// Pilihan tunggal bersegmen (Opnamix SegmentedControl). Varian `on-grad` untuk
// di atas pita gradien. Pergantian pilihan tanpa animasi gerak: dipakai sering.
export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: Component;
}

const props = withDefaults(
  defineProps<{
    options: readonly SegmentOption<T>[];
    label: string;
    variant?: 'plain' | 'on-grad';
    class?: string;
  }>(),
  { variant: 'plain', class: '' },
);
const model = defineModel<T>({ required: true });
</script>

<template>
  <div
    role="group"
    :aria-label="props.label"
    :class="
      cn(
        'grid auto-cols-fr grid-flow-col gap-0.5 rounded-xl p-0.5',
        props.variant === 'plain' ? 'border bg-surface-2' : 'bg-glass-shade',
        props.class,
      )
    "
  >
    <button
      v-for="option in props.options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      :class="
        cn(
          'press inline-flex h-7.5 items-center justify-center gap-1.5 rounded-[9px] px-2 text-meta font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5',
          props.variant === 'plain'
            ? 'text-muted-foreground aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-card'
            : 'text-on-grad-2 aria-pressed:bg-glass-2 aria-pressed:font-semibold aria-pressed:text-on-grad',
        )
      "
      @click="model = option.value"
    >
      <component :is="option.icon" v-if="option.icon" aria-hidden="true" />
      {{ option.label }}
    </button>
  </div>
</template>
