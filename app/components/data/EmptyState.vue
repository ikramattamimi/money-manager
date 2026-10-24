<script setup lang="ts">
import type { Component } from 'vue';
import ToneIcon from './ToneIcon.vue';

// Keadaan kosong di dalam kartu: ikon, judul, keterangan, aksi opsional
defineProps<{ icon: Component; title: string; description?: string }>();
</script>

<template>
  <div class="flex flex-col items-center gap-2 px-4 py-8 text-center">
    <ToneIcon :icon="icon" tone="neutral" />
    <b class="text-label font-semibold">{{ title }}</b>
    <p v-if="description" class="m-0 max-w-64 text-meta text-muted-foreground">{{ description }}</p>
    <slot />
  </div>
</template>
