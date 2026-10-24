<script setup lang="ts">
import type { Component } from 'vue';
import { ChevronRight } from '@lucide/vue';
import ToneIcon from './ToneIcon.vue';
import type { Tone } from './tone';

// Baris pengaturan: ikon bernada, judul + keterangan, panah
withDefaults(
  defineProps<{
    icon: Component;
    tone?: Tone;
    title: string;
    subtitle?: string;
    danger?: boolean;
  }>(),
  { tone: 'neutral', subtitle: undefined },
);
</script>

<template>
  <button
    type="button"
    :class="[
      'press grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] p-2.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      danger && 'text-bad',
    ]"
  >
    <ToneIcon :icon="icon" :tone="danger ? 'bad' : tone" size="sm" />
    <span class="min-w-0">
      <b class="block truncate text-label font-semibold">{{ title }}</b>
      <small v-if="subtitle" class="block truncate text-xs text-muted-foreground">{{
        subtitle
      }}</small>
    </span>
    <ChevronRight v-if="!danger" class="size-4 text-faint" aria-hidden="true" />
  </button>
</template>
