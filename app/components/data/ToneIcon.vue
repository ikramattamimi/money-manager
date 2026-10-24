<script setup lang="ts">
import type { Component } from 'vue';
import { cn } from '@/lib/utils';
import { TONE_CLASS, type Tone } from './tone';

// Ikon di dalam kotak berwarna lembut (Opnamix ToneIcon). Warna hanya dari token.
const props = withDefaults(
  defineProps<{ icon: Component; tone?: Tone; size?: 'xs' | 'sm' | 'md'; class?: string }>(),
  { tone: 'primary', size: 'md', class: '' },
);

const SIZE = {
  xs: 'size-6 rounded-[7px] [&_svg]:size-3.5',
  sm: 'size-7.5 rounded-lg [&_svg]:size-[15px]',
  md: 'size-9 rounded-[10px] [&_svg]:size-[18px]',
} as const;
</script>

<template>
  <span
    :class="
      cn('grid shrink-0 place-items-center', TONE_CLASS[props.tone], SIZE[props.size], props.class)
    "
    aria-hidden="true"
  >
    <component :is="props.icon" />
  </span>
</template>
