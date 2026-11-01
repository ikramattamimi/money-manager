<script setup lang="ts">
import { ChevronDown, ChevronLeft, ChevronRight } from '@lucide/vue';

// Navigasi bulan di bar atas (mockup .mnav): ‹ Okt 2026 › dengan judul yang
// bisa diketuk untuk membuka pemilih bulan. `hint` = rentang periode kecil
// kalau buku tidak mulai tanggal 1 ("25 Sep – 24 Okt").
const props = withDefaults(
  defineProps<{ label: string; longLabel?: string; hint?: string; canNext?: boolean }>(),
  { longLabel: undefined, hint: '', canNext: true },
);
const emit = defineEmits<{ prev: []; next: []; pick: [] }>();
</script>

<template>
  <div class="flex flex-1 items-center justify-center gap-0.5" role="group" aria-label="Bulan">
    <button
      type="button"
      aria-label="Bulan sebelumnya"
      class="month-btn grid size-11 place-items-center rounded-xl active:scale-90 active:bg-fill-press"
      @click="emit('prev')"
    >
      <ChevronLeft class="size-5" stroke-width="2.2" aria-hidden="true" />
    </button>
    <button
      type="button"
      :aria-label="`Pilih bulan, ${props.longLabel ?? props.label}`"
      class="flex min-w-[104px] flex-col items-center rounded-[9px] px-2 py-1 active:bg-fill-press"
      @click="emit('pick')"
    >
      <span class="flex items-center gap-1.5 text-bar font-semibold tracking-[-0.02em]" aria-live="polite">
        {{ props.label }}
        <ChevronDown class="size-3.5 text-ter" stroke-width="3" aria-hidden="true" />
      </span>
      <small v-if="hint" class="-mt-0.5 text-2xs leading-tight text-muted-foreground">{{
        hint
      }}</small>
    </button>
    <button
      type="button"
      aria-label="Bulan berikutnya"
      :disabled="!props.canNext"
      class="month-btn grid size-11 place-items-center rounded-xl active:scale-90 active:bg-fill-press disabled:opacity-30"
      @click="emit('next')"
    >
      <ChevronRight class="size-5" stroke-width="2.2" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.month-btn {
  transition: transform 120ms var(--ease-out);
}
</style>
