<script setup lang="ts">
// Chip kaca di kepala halaman: label + angka ringkas, titik status opsional
defineProps<{ label: string; value: string | number; tone?: 'ok' | 'warn' | 'bad' }>();

const DOT = { ok: 'bg-dot-ok', warn: 'bg-dot-warn', bad: 'bg-dot-bad' } as const;
</script>

<template>
  <span
    class="inline-flex h-6.5 items-center gap-1.5 whitespace-nowrap rounded-full border border-glass-line bg-glass px-2.5 text-xs text-on-grad-2"
  >
    <span v-if="tone" :class="['size-1.5 rounded-full', DOT[tone]]" aria-hidden="true" />
    {{ label }}
    <b class="font-bold tabular-nums text-on-grad">{{ value }}</b>
  </span>
</template>
