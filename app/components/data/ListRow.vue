<script setup lang="ts">
import { cn } from '@/lib/utils';

// Baris daftar (Opnamix ListRow): lead (ikon), judul + sub, nilai + meta di kanan
const props = defineProps<{
  title: string;
  subtitle?: string;
  value?: string;
  valueClass?: string;
  meta?: string;
  as?: 'div' | 'button';
  class?: string;
}>();
</script>

<template>
  <component
    :is="props.as ?? 'div'"
    :type="props.as === 'button' ? 'button' : undefined"
    :class="
      cn(
        'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[10px] bg-card px-2.5 py-2 text-left',
        props.as === 'button' &&
          'press hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        props.class,
      )
    "
  >
    <slot name="lead" />
    <span class="flex min-w-0 flex-col">
      <b class="truncate text-label font-semibold">{{ title }}</b>
      <small v-if="subtitle" class="truncate text-xs text-muted-foreground">{{ subtitle }}</small>
      <slot name="below" />
    </span>
    <span v-if="value || meta || $slots.end" class="flex flex-col items-end">
      <slot name="end">
        <b
          v-if="value"
          :class="cn('whitespace-nowrap text-label font-bold tabular-nums', valueClass)"
          >{{ value }}</b
        >
        <small v-if="meta" class="mt-px text-2xs tabular-nums text-faint">{{ meta }}</small>
      </slot>
    </span>
  </component>
</template>
