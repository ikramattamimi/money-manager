<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';

// Pemilih bulan kaca di kepala halaman: ‹ Okt 2026 ›, dengan rentang tanggal
// kecil di bawahnya kalau bulan buku tidak mulai tanggal 1 ("25 Sep – 24 Okt").
// canNext default true: prop boolean yang tidak diisi dibaca Vue sebagai false,
// jadi tanpa default panah berikutnya selalu mati di halaman yang tidak mengisinya.
const props = withDefaults(defineProps<{ label: string; hint?: string; canNext?: boolean }>(), {
  hint: '',
  canNext: true,
});
const emit = defineEmits<{ prev: []; next: [] }>();
</script>

<template>
  <div
    :class="[
      'inline-flex items-center rounded-lg border border-glass-line bg-glass',
      hint ? 'min-h-8 py-0.5' : 'h-8',
    ]"
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
    <span class="flex min-w-16 flex-col items-center px-0.5 text-center" aria-live="polite">
      <span class="text-meta font-semibold tabular-nums">{{ props.label }}</span>
      <small v-if="hint" class="-mt-px text-2xs leading-tight tabular-nums opacity-80">{{
        hint
      }}</small>
    </span>
    <button
      type="button"
      class="press press-icon grid size-7.5 place-items-center rounded-[7px] hover:bg-glass-2 disabled:opacity-40 [&_svg]:size-4"
      aria-label="Bulan berikutnya"
      :disabled="!props.canNext"
      @click="emit('next')"
    >
      <ChevronRight aria-hidden="true" />
    </button>
  </div>
</template>
