<script setup lang="ts">
import type { Component } from 'vue';
import { Check, X } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import type { Tone } from '@/components/data/tone';
import { linearFriction, shouldCommit } from '@/lib/gesture';

// Baris transaksi. Geser ke kiri untuk hapus (Urungkan lewat toast di induk).
// Warna nominal mengikuti SignedValue Opnamix: masuk biru, keluar merah.
const props = defineProps<{
  icon: Component;
  tone: Tone;
  title: string;
  subtitle: string;
  amount: string;
  kind: 'income' | 'expense' | 'transfer';
  meta?: string;
  /** Nominal asli yang dicoret kalau sebagian/seluruhnya diganti (fase 10 T6) */
  was?: string;
  deletable?: boolean;
  /** Mode pilih banyak: ikon jadi lingkaran centang, geser hapus nonaktif */
  selecting?: boolean;
  selected?: boolean;
}>();
const emit = defineEmits<{ delete: []; select: [] }>();

const row = ref<HTMLElement>();
const offset = ref(0);
const gone = ref(false);

const { dragging } = useSwipe(row, {
  axis: 'x',
  canStart: () => !!props.deletable && !props.selecting && !gone.value,
  // Ke kanan tidak ada aksi: gesekan, bukan berhenti mendadak
  onMove: (dx) => (offset.value = dx > 0 ? linearFriction(dx) : dx),
  onEnd: ({ delta, elapsedMs }) => {
    const width = row.value?.offsetWidth ?? 1;
    if (shouldCommit(-delta, width, elapsedMs, { ratio: 0.45, minFlick: 40 })) {
      offset.value = -width;
      gone.value = true;
      setTimeout(() => emit('delete'), 220);
    } else {
      offset.value = 0;
    }
  },
});

const AMOUNT_CLASS = {
  income: 'text-primary-accent',
  expense: 'text-bad',
  transfer: 'text-muted-foreground',
};

/** Sorotan sekali jalan untuk transaksi baru / dipulihkan (WAAPI, tanpa transisi warna permanen) */
function flash() {
  const el = row.value;
  if (!el) return;
  el.scrollIntoView({
    block: 'nearest',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
  const soft = getComputedStyle(document.documentElement).getPropertyValue('--primary-soft');
  el.animate(
    [{ backgroundColor: soft }, { backgroundColor: getComputedStyle(el).backgroundColor }],
    {
      duration: 900,
      easing: 'ease-out',
    },
  );
}
defineExpose({ flash });
</script>

<template>
  <div :class="['row-wrap grid rounded-[10px]', gone && 'gone']">
    <div class="relative min-h-0 overflow-hidden rounded-[10px]">
      <div
        v-if="dragging || offset !== 0"
        class="absolute inset-0 flex items-center justify-end gap-1.5 bg-bad pr-4.5 text-meta font-semibold text-white"
        aria-hidden="true"
      >
        <X class="size-4" />Hapus
      </div>
      <div
        ref="row"
        role="button"
        tabindex="0"
        :aria-pressed="selecting ? !!selected : undefined"
        :class="[
          'relative grid touch-pan-y grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 bg-card px-2.5 py-2.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          !dragging && 'transition-transform duration-[260ms] ease-out',
        ]"
        :style="{ transform: offset ? `translateX(${offset}px)` : undefined }"
        @click="!dragging && emit('select')"
        @keydown.enter="emit('select')"
        @keydown.delete="deletable && emit('delete')"
      >
        <span
          v-if="selecting"
          :class="[
            'grid size-9 place-items-center rounded-full border-2 transition-colors duration-150',
            selected ? 'border-primary-accent bg-primary-accent text-white' : 'border-input',
          ]"
          aria-hidden="true"
        >
          <Check v-if="selected" class="size-4" />
        </span>
        <ToneIcon v-else :icon="icon" :tone="tone" />
        <span class="flex min-w-0 flex-col">
          <b class="truncate text-label font-semibold">{{ title }}</b>
          <small class="truncate text-xs text-muted-foreground">{{ subtitle }}</small>
        </span>
        <span class="flex flex-col items-end">
          <b :class="['whitespace-nowrap text-label font-bold tabular-nums', AMOUNT_CLASS[kind]]">{{
            amount
          }}</b>
          <s v-if="was" class="text-2xs tabular-nums text-faint">{{ was }}</s>
          <small v-if="meta" class="mt-px text-2xs tabular-nums text-faint">{{ meta }}</small>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Baris yang dihapus menutup celahnya, lalu induk melepasnya dari daftar */
.row-wrap {
  grid-template-rows: 1fr;
  transition:
    grid-template-rows 220ms var(--ease-out),
    opacity 160ms ease;
}
.row-wrap.gone {
  grid-template-rows: 0fr;
  opacity: 0;
}
</style>
