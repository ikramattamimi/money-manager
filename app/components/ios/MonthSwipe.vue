<script setup lang="ts">
import { createVelocityTracker, project, rubber } from '@/lib/gesture';

// Daftar yang bisa digeser untuk pindah bulan. Slot `fixed` (mis. grafik bulanan)
// ikut menerima geseran tapi tidak ikut bergeser: ia tetap diam dan hanya
// sorotannya yang berpindah, jadi target ketukan tidak lari dari bawah jari.
// Daftar bulan lama (mockup .vp/.track/.slide,
// App.dc.html pDown/pMove/pUp + enter). Isi mengikuti jari 1:1 dan memudar
// sampai 0,55; petunjuk "‹ Sep" / "Nov ›" muncul sesuai jarak. Lepas: jadi
// kalau proyeksi momentum > 40% lebar, lanjut dengan kecepatan jari; batal
// kembali 320ms kurva drawer. Batas maju memakai rubber-band. Bulan baru
// masuk dari ±32px (240ms) setelah `monthKey` berubah. Hanya isi slot yang
// bergeser; ringkasan di atasnya langsung berganti.
const props = withDefaults(
  defineProps<{
    /** Berubah tiap bulan berganti (mis. "2026-10"): memicu animasi masuk */
    monthKey: string;
    prevLabel: string;
    nextLabel: string;
    canNext?: boolean;
    disabled?: boolean;
    /** Data bulan baru belum tiba (placeholder/pending): isi masuk setelah data datang, bukan sebelumnya */
    loading?: boolean;
  }>(),
  { canNext: true, disabled: false, loading: false },
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
let fallback: ReturnType<typeof setTimeout> | undefined;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Reduce Motion: lepas gestur langsung pindah, tanpa meluncur */
const glide = (css: string) => (reduceMotion() ? 'none' : css);

function setHints(x: number, settle: boolean) {
  const t = settle ? glide('opacity 160ms ease-out') : 'none';
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
  let dir: 1 | -1 | 0 =
    e.type === 'pointercancel' ? 0 : Math.abs(proj) > w * 0.4 ? (proj < 0 ? 1 : -1) : 0;
  if (dir === 1 && !props.canNext) dir = 0;
  // Jari berbalik arah saat dilepas: batal
  if (dir !== 0 && Math.abs(v) > 0.05 && Math.sign(v) === dir) dir = 0;
  setHints(0, true);
  if (!dir) {
    el.style.transition = glide('transform 320ms var(--ease-drawer), opacity 200ms ease-out');
    el.style.transform = 'translateX(0)';
    el.style.opacity = '1';
    return;
  }
  const remaining = w - Math.abs(d.dx);
  const dur = Math.max(110, Math.min(240, Math.abs(v) > 0.05 ? remaining / Math.abs(v) : 220));
  el.style.transition = glide(`transform ${dur}ms var(--ease-out), opacity ${dur}ms ease-out`);
  el.style.transform = `translateX(${dir > 0 ? -w : w}px)`;
  el.style.opacity = '0';
  setTimeout(
    () => {
      pendingDir = dir;
      emit('shift', dir);
      // Bulan tidak berganti (mis. ditolak induk): kembalikan isi, jangan tertinggal kosong
      clearTimeout(fallback);
      fallback = setTimeout(() => {
        if (!pendingDir) return;
        pendingDir = 0;
        el.style.transition = glide('transform 240ms var(--ease-out), opacity 200ms ease-out');
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
      }, 800);
    },
    reduceMotion() ? 0 : dur,
  );
}

function swallow(e: Event) {
  if (!justDragged) return;
  e.stopPropagation();
  e.preventDefault();
}

let enterToken = 0;
let enterTimer: ReturnType<typeof setTimeout> | undefined;
let waiting: 1 | -1 | null = null;

function enter(dir: 1 | -1) {
  const el = slide.value;
  waiting = null;
  clearTimeout(enterTimer);
  if (!el) return;
  for (const anim of el.getAnimations()) anim.cancel();
  el.animate(
    [
      { transform: `translateX(${dir > 0 ? 32 : -32}px)`, opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  );
  // Animasi mengambil alih mulai frame pertama, jadi gaya tahan boleh dilepas
  el.style.transition = 'none';
  el.style.transform = '';
  el.style.opacity = '';
}

/**
 * Bulan baru: isi ditahan transparan di posisi masuk sampai datanya tiba
 * (maksimal 500ms), baru meluncur masuk dari sisi arah geser. Tanpa ini data
 * bulan lama sempat terlihat meluncur masuk lalu berganti di tengah jalan
 * (kedip). Panah/pemilih bulan juga memakai ini.
 */
watch(
  () => props.monthKey,
  async (key, old) => {
    const el = slide.value;
    if (!el || !old) return;
    const dir: 1 | -1 = pendingDir || (key > old ? 1 : -1);
    pendingDir = 0;
    clearTimeout(fallback);
    clearTimeout(enterTimer);
    waiting = null;
    const token = ++enterToken;
    // Mulai dari atas daftar seperti mockup, tanpa animasi gulir
    const top = root.value ? root.value.getBoundingClientRect().top + window.scrollY - 120 : 0;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top) });
    for (const anim of el.getAnimations()) anim.cancel();
    if (reduceMotion()) {
      el.style.transition = 'none';
      el.style.transform = '';
      el.style.opacity = '';
      return;
    }
    el.style.transition = 'none';
    el.style.transform = `translateX(${dir > 0 ? 32 : -32}px)`;
    el.style.opacity = '0';
    // Beri satu frame supaya status loading dari query bulan baru sempat terbit
    await nextTick();
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    if (token !== enterToken) return;
    if (!props.loading) return enter(dir);
    waiting = dir;
    enterTimer = setTimeout(() => enter(dir), 500);
  },
  { flush: 'post' },
);
watch(
  () => props.loading,
  (l) => {
    if (!l && waiting) enter(waiting);
  },
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
    <slot name="fixed" />
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
