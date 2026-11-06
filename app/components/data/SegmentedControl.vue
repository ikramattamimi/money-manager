<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue';
import { cn } from '@/lib/utils';

// Pilihan tunggal bersegmen dengan ikon opsional (dipakai form lama di dialog
// iPad/desktop). Untuk layar baru pakai components/ios/Segmented.vue.
// Pergantian pilihan tanpa animasi gerak: dipakai sering.
export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: Component;
}

const props = withDefaults(
  defineProps<{
    options: readonly SegmentOption<T>[];
    label: string;
    class?: string;
  }>(),
  { class: '' },
);
const model = defineModel<T>({ required: true });
</script>

<template>
  <div
    role="group"
    :aria-label="props.label"
    :class="cn('grid auto-cols-fr grid-flow-col gap-0.5 rounded-[9px] bg-fill p-0.5', props.class)"
  >
    <button
      v-for="option in props.options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      class="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[7px] px-2 text-label font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-[var(--seg-on)] aria-pressed:shadow-[var(--shadow-seg)] [&_svg]:size-3.5"
      @click="model = option.value"
    >
      <component :is="option.icon" v-if="option.icon" aria-hidden="true" />
      {{ option.label }}
    </button>
  </div>
</template>
