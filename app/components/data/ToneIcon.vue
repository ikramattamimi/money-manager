<script setup lang="ts">
import type { Component } from 'vue';
import { cn } from '@/lib/utils';
import { TONE_CLASS, TONE_FILL, type Tone } from './tone';

// Ikon kategori/akun (mockup Icon.dc.html): kotak lembut berwarna, atau solid
// dengan ikon putih seperti baris Pengaturan iOS. Warna hanya dari token.
const props = withDefaults(
  defineProps<{
    icon: Component;
    tone?: Tone;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    solid?: boolean;
    class?: string;
  }>(),
  { tone: 'primary', size: 'md', solid: false, class: '' },
);

// Radius 30% (lembut) atau 24% (solid), ikon 50% / 58% dari kotak
const SIZE = {
  xs: 'size-[22px] rounded-[7px] [&_svg]:size-3',
  sm: 'size-7.5 rounded-[9px] [&_svg]:size-[15px]',
  md: 'size-9 rounded-[11px] [&_svg]:size-[18px]',
  lg: 'size-[38px] rounded-[11px] [&_svg]:size-[20px]',
} as const;
const SOLID_SIZE = {
  xs: 'size-[22px] rounded-[6px] [&_svg]:size-[13px]',
  sm: 'size-7.5 rounded-[7px] [&_svg]:size-[17px]',
  md: 'size-9 rounded-[9px] [&_svg]:size-[21px]',
  lg: 'size-[38px] rounded-[9px] [&_svg]:size-[22px]',
} as const;
</script>

<template>
  <span
    :class="
      cn(
        'grid shrink-0 place-items-center',
        props.solid
          ? [TONE_FILL[props.tone], 'text-white [&_svg]:stroke-[2.2]', SOLID_SIZE[props.size]]
          : [TONE_CLASS[props.tone], SIZE[props.size]],
        props.class,
      )
    "
    aria-hidden="true"
  >
    <component :is="props.icon" />
  </span>
</template>
