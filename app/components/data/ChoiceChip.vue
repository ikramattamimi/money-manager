<script setup lang="ts">
import type { Component } from 'vue';

// Chip pilihan di form catat transaksi. Kosong = garis putus-putus.
defineProps<{ icon: Component; label: string; filled?: boolean }>();
</script>

<template>
  <button
    type="button"
    :class="[
      'press inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-meta font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5',
      filled
        ? 'border-primary-accent/35 bg-primary-soft text-primary-ink [&_svg]:text-primary-accent'
        : 'border-dashed bg-transparent font-medium text-faint',
    ]"
  >
    <component :is="icon" aria-hidden="true" />
    {{ label }}
  </button>
</template>
