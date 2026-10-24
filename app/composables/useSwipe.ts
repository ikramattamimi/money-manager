import type { Ref } from 'vue';

export interface SwipeEnd {
  /** Jarak di sumbu yang dipilih (px), positif ke kanan/bawah */
  delta: number;
  elapsedMs: number;
}

interface SwipeOptions {
  axis: 'x' | 'y';
  /** Jarak sebelum arah dianggap jelas (hindari bentrok dengan scroll) */
  threshold?: number;
  /** Return false untuk mengabaikan gestur ini (mis. mulai dari input) */
  canStart?: (event: PointerEvent) => boolean;
  onMove: (delta: number) => void;
  onEnd: (end: SwipeEnd) => void;
}

/**
 * Drag satu sumbu dengan Pointer Events. Arah dikunci setelah `threshold` px:
 * kalau gerak dominan di sumbu lain, gestur dilepas ke browser (scroll).
 * Setelah terkunci, pointer di-capture supaya drag tetap jalan walau jari
 * keluar elemen. Jari kedua diabaikan.
 */
export function useSwipe(target: Ref<HTMLElement | undefined>, options: SwipeOptions) {
  const dragging = ref(false);
  const threshold = options.threshold ?? 10;
  let pointer: number | null = null;
  let start = { x: 0, y: 0, t: 0 };
  let locked: 'x' | 'y' | null = null;
  let delta = 0;

  function down(event: PointerEvent) {
    if (pointer !== null) return;
    if (options.canStart && !options.canStart(event)) return;
    pointer = event.pointerId;
    start = { x: event.clientX, y: event.clientY, t: performance.now() };
    locked = null;
    delta = 0;
  }

  function move(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!locked) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (locked !== options.axis) return;
      try {
        target.value?.setPointerCapture(event.pointerId);
      } catch {
        // Pointer sudah tidak aktif (mis. event sintetis): drag tetap jalan tanpa capture
      }
      dragging.value = true;
    }
    if (locked !== options.axis) return;
    delta = options.axis === 'x' ? dx : dy;
    options.onMove(delta);
  }

  function up(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (!dragging.value) return;
    dragging.value = false;
    options.onEnd({ delta, elapsedMs: performance.now() - start.t });
  }

  watch(
    target,
    (el, old) => {
      old?.removeEventListener('pointerdown', down);
      old?.removeEventListener('pointermove', move);
      old?.removeEventListener('pointerup', up);
      old?.removeEventListener('pointercancel', up);
      el?.addEventListener('pointerdown', down);
      el?.addEventListener('pointermove', move);
      el?.addEventListener('pointerup', up);
      el?.addEventListener('pointercancel', up);
    },
    { immediate: true },
  );

  return { dragging };
}
