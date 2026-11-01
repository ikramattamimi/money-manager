<script setup lang="ts">
import { createVelocityTracker, project, rubber } from '@/lib/gesture';

// Daftar yang bisa digeser untuk pindah bulan (mockup .vp/.track/.slide,
// App.dc.html pDown/pMove/pUp + enter). Isi mengikuti jari 1:1 dan memudar
// sampai 0,55; petunjuk "‹ Sep" / "Nov ›" muncul sesuai jarak. Lepas: jadi
// kalau proyeksi momentum > 40% lebar, lanjut dengan kecepatan jari; batal
// kembali 320ms kurva drawer. Batas maju memakai rubber-band. Bulan baru
// masuk dari ±44px (300ms) setelah `monthKey` berubah. Hanya isi slot yang
// bergeser; ringkasan di atasnya langsung berganti.
const props = withDefaults(
  defineProps<{
    /** Berubah tiap bulan berganti (mis. "2026-10"): memicu animasi masuk */
    monthKey: string;
    prevLabel: string;
    nextLabel: string;
    canNext?: boolean;
    disabled?: boolean;
  }>(),
  { canNext: true, disabled: false },
);
const emit = defineEmits<{ shift: [dir: 1 | -1] }>();

const root = ref<HTMLElement>();
const slide = ref<HTMLElement>();
const hintL = ref<HTMLElement>();
const hintR = ref<HTMLElement>();

let drag: {
  id: number;
  x0: number;
  y0: number;
  dx: number;
  lock: 'x' | null;
  tracker: ReturnType<typeof createVelocityTracker>;
} | null = null;
let justDragged = false;
let pendingDir: 1 | -1 | 0 = 0;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function setHints(x: number, settle: boolean) {
  const t = settle ? 'opacity 160ms ease-out' : 'none';
  if (hintL.value) {
    hintL.value.style.transition = t;
    hintL.value.style.opacity = String(x > 0 ? Math.min(x / 90, 1) : 0);
  }
  if (hintR.value) {
    hintR.value.style.transition = t;
    hintR.value.style.opacity = String(x < 0 && props.canNext ? Math.min(-x / 90, 1) : 0);
  }
}

function down(e: PointerEvent) {
  if (props.disabled || drag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  // Tepi kiri milik gestur kembali
  if (e.clientX < 24) return;
  const tracker = createVelocityTracker();
  tracker.reset(e.clientX);
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, lock: null, tracker };
}

function move(e: PointerEvent) {
  const d = drag;
  const el = slide.value;
  if (!d || e.pointerId !== d.id || !el) return;
  if (!d.lock) {
    const dx0 = e.clientX - d.x0;
    const dy0 = e.clientY - d.y0;
    if (Math.hypot(dx0, dy0) < 10) return;
    if (Math.abs(dx0) <= Math.abs(dy0)) {
      drag = null; // gulir vertikal
      return;
    }
    d.lock = 'x';
    d.x0 += Math.sign(dx0) * 10;
    try {
      root.value?.setPointerCapture(d.id);
    } catch {
      // Pointer sudah berakhir: tetap jalan tanpa capture
    }
    el.style.transition = 'none';
  }
  const w = root.value?.offsetWidth || 390;
  let x = e.clientX - d.x0;
  if (x < 0 && !props.canNext) x = rubber(x, w);
  d.dx = x;
  d.tracker.add(e.clientX);
  el.style.transform = `translateX(${x}px)`;
  el.style.opacity = String(1 - Math.min(Math.abs(x) / w, 1) * 0.45);
  setHints(x, false);
}

function up(e: PointerEvent) {
  const d = drag;
  const el = slide.value;
  if (!d || e.pointerId !== d.id) return;
  drag = null;
  if (d.lock !== 'x' || !el) return;
  if (Math.abs(d.dx) > 4) {
    justDragged = true;
    setTimeout(() => (justDragged = false), 0);
  }
  const w = root.value?.offsetWidth || 390;
  const v = d.tracker.velocity(); // px/ms
  const proj = d.dx + project(v * 1000);
  let dir: 1 | -1 | 0 = e.type === 'pointercancel' ? 0 : Math.abs(proj) > w * 0.4 ? (proj < 0 ? 1 : -1) : 0;
  if (dir === 1 && !props.canNext) dir = 0;
  // Jari berbalik arah saat dilepas: batal
  if (dir !== 0 && Math.abs(v) > 0.05 && Math.sign(v) === dir) dir = 0;
  setHints(0, true);
  if (!dir) {
    el.style.transition = 'transform 320ms var(--ease-drawer), opacity 200ms ease-out';
    el.style.transform = 'translateX(0)';
    el.style.opacity = '1';
    return;
  }
  const remaining = w - Math.abs(d.dx);
  const dur = Math.max(110, Math.min(240, Math.abs(v) > 0.05 ? remaining / Math.abs(v) : 220));
  el.style.transition = `transform ${dur}ms var(--ease-out), opacity ${dur}ms ease-out`;
  el.style.transform = `translateX(${dir > 0 ? -w : w}px)`;
  el.style.opacity = '0';
  setTimeout(() => {
    pendingDir = dir;
    emit('shift', dir);
  }, dur);
}

function swallow(e: Event) {
  if (!justDragged) return;
  e.stopPropagation();
  e.preventDefault();
}

/** Bulan baru: masuk dari sisi arah geser (panah/pemilih bulan juga memakai ini) */
watch(
  () => props.monthKey,
  (key, old) => {
    const el = slide.value;
    if (!el || !old) return;
    const dir = pendingDir || (key > old ? 1 : -1);
    pendingDir = 0;
    // Mulai dari atas daftar seperti mockup, tanpa animasi gulir
    const top = root.value ? root.value.getBoundingClientRect().top + window.scrollY - 120 : 0;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top) });
    if (reduceMotion()) {
      el.style.transition = 'none';
      el.style.transform = '';
      el.style.opacity = '1';
      return;
    }
    el.style.transition = 'none';
    el.style.transform = `translateX(${dir > 0 ? 44 : -44}px)`;
    el.style.opacity = '0';
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.style.transition = 'transform 300ms var(--ease-drawer), opacity 200ms ease-out';
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });
  },
  { flush: 'post' },
);
</script>

<template>
  <div
    ref="root"
    class="month-swipe relative touch-pan-y select-none"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
    @click.capture="swallow"
  >
    <div
      ref="hintL"
      class="month-hint pointer-events-none absolute left-3 top-10 z-[3] rounded-full bg-card px-3 py-[7px] text-meta font-semibold text-primary-accent opacity-0"
      aria-hidden="true"
    >
      ‹ {{ prevLabel }}
    </div>
    <div
      ref="hintR"
      class="month-hint pointer-events-none absolute right-3 top-10 z-[3] rounded-full bg-card px-3 py-[7px] text-meta font-semibold text-primary-accent opacity-0"
      aria-hidden="true"
    >
      {{ nextLabel }} ›
    </div>
    <div ref="slide">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.month-swipe {
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.month-hint {
  box-shadow: var(--shadow-float);
}
</style>
