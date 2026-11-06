<script setup lang="ts">
import type { Component } from 'vue';
import { Check, ChevronRight } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import type { Tone } from '@/components/data/tone';

// Baris akun di halaman Akun (mockup .row di grup akun): ikon solid 30px,
// nama + keterangan, saldo tebal (merah kalau negatif), chevron. Ketuk =
// buka rincian; tahan 450ms = mode pilih banyak, sama seperti TxRow (getar
// singkat, klik setelah tahan diabaikan). Tekan = latar isian, tanpa skala.
const props = defineProps<{
  icon: Component;
  tone: Tone;
  name: string;
  subtitle?: string;
  balance: string;
  negative?: boolean;
  selecting?: boolean;
  selected?: boolean;
  /** false = tahan lama tidak memulai mode pilih (mis. viewer) */
  selectable?: boolean;
}>();
const emit = defineEmits<{ open: []; longpress: [] }>();

let timer: ReturnType<typeof setTimeout> | undefined;
let start = { x: 0, y: 0 };
let fired = false;

function down(e: PointerEvent) {
  if (props.selecting || props.selectable === false) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  fired = false;
  start = { x: e.clientX, y: e.clientY };
  clearTimeout(timer);
  timer = setTimeout(() => {
    fired = true;
    navigator.vibrate?.(8);
    emit('longpress');
  }, 450);
}
function move(e: PointerEvent) {
  if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearTimeout(timer);
}
function cancel() {
  clearTimeout(timer);
}
function click() {
  if (fired) {
    fired = false;
    return;
  }
  emit('open');
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <button
    type="button"
    :aria-pressed="selecting ? selected : undefined"
    class="acc-row relative flex min-h-12 w-full items-center gap-3 py-2 pl-4 pr-3.5 text-left active:bg-fill-press"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="cancel"
    @pointerleave="cancel"
    @pointercancel="cancel"
    @contextmenu.prevent
    @click="click"
  >
    <span
      v-if="selecting"
      :class="[
        'grid size-6 shrink-0 place-items-center rounded-full border-[1.6px]',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-chevron text-transparent',
      ]"
      aria-hidden="true"
    >
      <Check class="size-[13px]" stroke-width="3.4" />
    </span>
    <ToneIcon :icon="icon" :tone="tone" size="sm" solid />
    <span class="flex min-w-0 flex-1 flex-col">
      <b class="truncate text-row font-medium tracking-[-0.01em]">{{ name }}</b>
      <span v-if="subtitle" class="truncate text-meta text-muted-foreground">{{ subtitle }}</span>
    </span>
    <span
      :class="[
        'shrink-0 whitespace-nowrap text-amount font-semibold',
        negative ? 'text-exp' : 'text-foreground',
      ]"
      >{{ balance }}</span
    >
    <ChevronRight
      v-if="!selecting"
      class="-mr-1 size-[18px] shrink-0 text-chevron"
      stroke-width="2.6"
      aria-hidden="true"
    />
  </button>
</template>

<style scoped>
.acc-row {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  transition: background-color 120ms ease;
}
/* Garis pemisah mulai setelah ikon (58px), kecuali baris pertama */
.acc-row + .acc-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 58px;
  height: 0.5px;
  background: var(--sep);
}
</style>
