<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

// Kartu Opnamix: putih, garis tipis, radius 14px, bayangan halus
const props = defineProps<{ as?: string; class?: HTMLAttributes['class'] }>();
</script>

<template>
  <component
    :is="props.as ?? 'div'"
    :class="cn('rounded-card border bg-card text-foreground shadow-card', props.class)"
  >
    <slot />
  </component>
</template>
