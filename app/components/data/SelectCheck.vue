<script setup lang="ts">
import { Check } from '@lucide/vue';

// Lingkaran centang pengganti ikon baris saat mode pilih banyak
defineProps<{ selected: boolean; size?: 'sm' | 'md' }>();
</script>

<template>
  <span
    :class="[
      'grid shrink-0 place-items-center rounded-full border-2 transition-colors duration-150',
      size === 'sm' ? 'size-7' : 'size-9',
      selected ? 'border-primary-accent bg-primary-accent text-white' : 'border-input',
    ]"
    aria-hidden="true"
  >
    <Check v-if="selected" class="size-4" />
  </span>
</template>
