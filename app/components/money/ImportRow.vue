<script setup lang="ts">
import type { Component } from 'vue';
import { Check } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import type { Tone } from '@/components/data/tone';
import { createVelocityTracker, project, rubber } from '@/lib/gesture';

// Baris mutasi di pratinjau impor (mockup .swrow/.rrow): ketuk = lembar
// kategori, geser kiri = lewati (geser lagi = pakai). Lingkaran centang di
// kiri = ikut disimpan, bisa diketuk (untuk keyboard/pembaca layar). Di sini
// baris boleh digeser karena layar impor tidak punya geser-bulan.
// Gestur: arah dikunci setelah 10px, baris ikut jari 1:1 (transform langsung),
// lepas memakai proyeksi momentum > 40% lebar aksi, lalu kembali 260ms.
const props = defineProps<{
  icon: Component;
  tone: Tone;
  title: string;
  subtitle: string;
  amount: string;
  direction: 'in' | 'out';
  included: boolean;
  selecting?: boolean;
  selected?: boolean;
  warn?: boolean;
  /** Baris tercatat: hanya dibaca */
  readonly?: boolean;
}>();
const emit = defineEmits<{ open: []; toggle: [] }>();

const ACTION = 96;
const EDGE = 24;
const row = ref<HTMLElement>();
const bg = ref<HTMLElement>();
let pointer: number | null = null;
let startX = 0;
let startY = 0;
let x = 0;
let mode: 'idle' | 'h' | 'v' = 'idle';
let moved = false;
const tracker = createVelocityTracker();

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function paint(value: number, animate = false) {
  const el = row.value;
  if (!el) return;
  el.style.transition = animate && !reduceMotion() ? 'transform 260ms var(--ease-out)' : 'none';
  el.style.transform = value ? `translateX(${value}px)` : '';
  if (bg.value) bg.value.style.opacity = String(Math.min(1, Math.abs(value) / 40));
}

function down(event: PointerEvent) {
  if (props.readonly || props.selecting || pointer !== null || event.button !== 0) return;
  if (event.clientX < EDGE) return; // tepi kiri milik geser-kembali
  pointer = event.pointerId;
  startX = event.clientX;
  startY = event.clientY;
  mode = 'idle';
  moved = false;
  x = 0;
  tracker.reset(0);
}

function move(event: PointerEvent) {
  if (event.pointerId !== pointer) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  if (mode === 'idle') {
    if (Math.hypot(dx, dy) < 10) return;
    mode = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    if (mode === 'v') {
      pointer = null;
      return;
    }
    moved = true;
    try {
      row.value?.setPointerCapture(event.pointerId);
    } catch {
      // pointer sintetis
    }
  }
  // Ke kiri 1:1 sampai lebar aksi lalu rubber-band; ke kanan selalu berat
  x = dx < -ACTION ? -ACTION + rubber(dx + ACTION, ACTION) : dx > 0 ? rubber(dx, ACTION) : dx;
  tracker.add(x);
  paint(x);
}

function up(event: PointerEvent) {
  if (event.pointerId !== pointer) return;
  pointer = null;
  if (mode !== 'h') return;
  const v = tracker.velocity() * 1000;
  const end = x + project(v, 0.99);
  // Jari berbalik ke kanan saat dilepas = batal
  if (end < -ACTION * 0.4 && v <= 0) emit('toggle');
  paint(0, true);
}

function click(event: MouseEvent) {
  if (moved) {
    moved = false;
    event.preventDefault();
    return;
  }
  if (!props.readonly) emit('open');
}
</script>

<template>
  <div class="imp-row relative overflow-hidden">
    <span
      ref="bg"
      class="absolute inset-0 flex items-center justify-end bg-[var(--tone-gray)] pr-5 text-label font-semibold text-white opacity-0"
      aria-hidden="true"
      >{{ included ? 'Lewati' : 'Pakai' }}</span
    >
    <div
      ref="row"
      :class="[
        'relative flex min-h-14 touch-pan-y items-center gap-3 bg-card py-2 pl-3 pr-4',
        readonly && 'imp-ro',
      ]"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
    >
      <button
        type="button"
        :disabled="readonly"
        :aria-pressed="selecting ? selected : included"
        :aria-label="
          selecting
            ? `Pilih ${title}`
            : included
              ? `Lewati ${title}, tidak disimpan`
              : `Pakai ${title}, ikut disimpan`
        "
        class="grid size-11 shrink-0 place-items-center -my-1.5 -ml-1.5 -mr-2"
        @click="selecting ? emit('open') : emit('toggle')"
      >
        <span
          :class="[
            'grid size-6 place-items-center rounded-full border-[1.6px] text-white',
            readonly
              ? 'border-transparent bg-[var(--chevron)]'
              : (selecting ? selected : included)
                ? 'border-transparent bg-primary'
                : 'border-[var(--chevron)]',
          ]"
        >
          <Check
            v-if="readonly || (selecting ? selected : included)"
            class="size-[13px]"
            stroke-width="3.4"
            aria-hidden="true"
          />
        </span>
      </button>
      <button
        type="button"
        :disabled="readonly"
        class="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        @click="click"
      >
        <ToneIcon
          :icon="icon"
          :tone="tone"
          size="sm"
          :class="!included && !selecting ? 'opacity-45' : ''"
        />
        <span :class="['flex min-w-0 flex-1 flex-col', !included && !selecting && 'opacity-45']">
          <b class="truncate text-row font-medium tracking-[-0.01em]">{{ title }}</b>
          <span :class="['truncate text-meta', warn ? 'text-warn' : 'text-muted-foreground']">{{
            subtitle
          }}</span>
        </span>
        <b
          :class="[
            'shrink-0 whitespace-nowrap text-amount font-semibold',
            direction === 'in' ? 'text-inc' : 'text-exp',
            !included && !selecting && 'line-through opacity-45',
          ]"
          >{{ direction === 'in' ? '+' : '−' }}{{ amount }}</b
        >
      </button>
    </div>
  </div>
</template>

<style scoped>
.imp-row + .imp-row {
  box-shadow: inset 0 0.5px 0 var(--sep);
}
.imp-row + .imp-row > div {
  box-shadow: inset 0 0.5px 0 var(--sep);
}
.imp-ro {
  background: var(--surface-2);
}
</style>
