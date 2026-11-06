<script setup lang="ts">
import { Check } from '@lucide/vue';

// Baris transaksi gaya Realbyte (mockup .ti): kategori induk + sub di kolom
// kiri 86px, catatan + akun di tengah, nominal berwarna di kanan (masuk biru,
// keluar merah, transfer abu). Ketuk = buka; tahan 450ms = mode pilih banyak
// (getar singkat, klik setelah tahan diabaikan). Tidak ada geser-hapus:
// geser horizontal milik daftar (pindah bulan).
const props = defineProps<{
  id: string;
  cat: string;
  sub: string;
  title: string;
  /** Keterangan: tampil di samping catatan, lebih kecil dan abu */
  desc?: string;
  acct: string;
  amount: string;
  tone: 'inc' | 'exp' | 'trf';
  /** Nominal asli dicoret kalau sebagian/seluruhnya diganti */
  was?: string;
  /** Saldo berjalan di bawah nominal (rincian akun) */
  balance?: string;
  selecting?: boolean;
  selected?: boolean;
  /** false = tahan lama tidak memulai mode pilih (mis. viewer) */
  selectable?: boolean;
}>();
const emit = defineEmits<{ open: []; longpress: [] }>();

const TONE = { inc: 'text-inc', exp: 'text-exp', trf: 'text-muted-foreground' } as const;

const row = ref<HTMLElement>();
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

/** Sorotan sekali jalan untuk transaksi baru / dipulihkan (WAAPI) */
function flash() {
  const el = row.value;
  if (!el) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  const color = getComputedStyle(el).getPropertyValue('--primary-soft').trim();
  el.animate([{ backgroundColor: color }, { backgroundColor: 'transparent' }], {
    duration: 1400,
    easing: 'ease-out',
  });
}
defineExpose({ flash });
</script>

<template>
  <button
    ref="row"
    type="button"
    :data-tx="id"
    :aria-pressed="selecting ? selected : undefined"
    class="tx-row grid w-full grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-2.5 text-left active:bg-fill-press"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="cancel"
    @pointerleave="cancel"
    @pointercancel="cancel"
    @contextmenu.prevent
    @click="click"
  >
    <span class="flex min-w-0 items-center gap-2">
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
      <span class="flex min-w-0 flex-col text-2xs leading-tight text-muted-foreground">
        <span class="truncate">{{ cat }}</span>
        <i v-if="sub" class="truncate text-[10px] not-italic text-faint">{{ sub }}</i>
      </span>
    </span>
    <span class="flex min-w-0 flex-col">
      <span class="flex min-w-0 items-baseline gap-1.5">
        <b class="max-w-[70%] shrink-0 truncate text-label font-semibold tracking-[-0.01em]">{{ title }}</b>
        <span v-if="desc" class="min-w-0 flex-1 truncate text-note font-medium text-faint">{{ desc }}</span>
      </span>
      <span class="truncate text-2xs text-muted-foreground">{{ acct }}</span>
    </span>
    <span class="flex flex-col items-end whitespace-nowrap">
      <!-- Ukuran sama dengan total per hari di DayGroup -->
      <span :class="['text-amount font-semibold', TONE[tone]]">{{ amount }}</span>
      <s v-if="was" class="text-2xs text-faint">{{ was }}</s>
      <small v-if="balance" class="text-2xs font-medium text-muted-foreground">{{ balance }}</small>
    </span>
  </button>
</template>

<style scoped>
.tx-row {
  position: relative;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  transition: background-color 120ms ease;
}
/* Garis pemisah mulai 16px dari kiri, kecuali baris terakhir */
.tx-row + .tx-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 0;
  height: 0.5px;
  background: var(--sep);
}
</style>
