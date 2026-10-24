<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';

// Pemilih bulan kaca di kepala halaman: ‹ Okt 2026 ›
const props = defineProps<{ label: string; canNext?: boolean }>();
const emit = defineEmits<{ prev: []; next: [] }>();
</script>

<template>
  <div
    class="inline-flex h-8 items-center rounded-lg border border-glass-line bg-glass"
    role="group"
    aria-label="Pilih bulan"
  >
    <button
      type="button"
      class="press press-icon grid size-7.5 place-items-center rounded-[7px] hover:bg-glass-2 [&_svg]:size-4"
      aria-label="Bulan sebelumnya"
      @click="emit('prev')"
    >
      <ChevronLeft aria-hidden="true" />
    </button>
    <span
      class="min-w-16 px-0.5 text-center text-meta font-semibold tabular-nums"
      aria-live="polite"
    >
      {{ props.label }}
    </span>
    <button
      type="button"
      class="press press-icon grid size-7.5 place-items-center rounded-[7px] hover:bg-glass-2 disabled:opacity-40 [&_svg]:size-4"
      aria-label="Bulan berikutnya"
      :disabled="props.canNext === false"
      @click="emit('next')"
    >
      <ChevronRight aria-hidden="true" />
    </button>
  </div>
</template>
