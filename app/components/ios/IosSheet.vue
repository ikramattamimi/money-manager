<script setup lang="ts">
import { createVelocityTracker, project, rubber } from '@/lib/gesture';

// Lembar bawah iOS (mockup .sheet, App.dc.html sDown/sMove/sUp): melayang
// 8px dari tepi, radius 30px, maks 80% tinggi. Masuk 320ms kurva drawer,
// keluar 200ms. Ditarik dari pegangan atau kepala lembar: ikut jari 1:1,
// rubber-band ke atas, tutup kalau proyeksi momentum > 35% tinggi; scrim
// memudar sesuai jarak. Esc dan scrim menutup. Di iPad/desktop lebar 420px.
const open = defineModel<boolean>('open', { required: true });
const props = withDefaults(defineProps<{ title?: string; label?: string }>(), {
  title: undefined,
  label: undefined,
});
const emit = defineEmits<{ opened: []; closed: [] }>();

const rendered = ref(false);
const sheet = ref<HTMLElement>();
const scrim = ref<HTMLElement>();
const titleId = useId();
let lastFocus: HTMLElement | null = null;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function show() {
  clearTimeout(closeTimer);
  lastFocus = document.activeElement as HTMLElement | null;
  rendered.value = true;
  document.addEventListener('keydown', onKey);
  nextTick(() => {
    sheet.value?.focus({ preventScroll: true });
    emit('opened');
  });
}

/** Keluar: lanjut dari posisi sekarang ke bawah, `ms` menyambung kecepatan jari */
function hide(ms = 200) {
  document.removeEventListener('keydown', onKey);
  const el = sheet.value;
  const sc = scrim.value;
  if (el && sc && !reduceMotion()) {
    el.style.animation = 'none';
    sc.style.animation = 'none';
    el.style.transition = `transform ${ms}ms var(--ease-drawer)`;
    el.style.transform = 'translateY(110%)';
    sc.style.transition = `opacity ${ms}ms ease-out`;
    sc.style.opacity = '0';
  }
  closeTimer = setTimeout(
    () => {
      rendered.value = false;
      lastFocus?.focus({ preventScroll: true });
      emit('closed');
    },
    reduceMotion() ? 0 : ms,
  );
}

/** Durasi keluar dari gestur lepas; kosong = keluar biasa 200ms */
let releaseMs: number | undefined;
watch(open, (value) => {
  if (value) show();
  else hide(releaseMs);
  releaseMs = undefined;
});
onMounted(() => open.value && show());
onBeforeUnmount(() => {
  clearTimeout(closeTimer);
  document.removeEventListener('keydown', onKey);
});

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}

// ----- tarik turun -----
let drag: { id: number; y0: number; dy: number } | null = null;
const tracker = createVelocityTracker();

function down(event: PointerEvent) {
  if (drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
  if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return;
  const el = sheet.value;
  if (!el) return;
  drag = { id: event.pointerId, y0: event.clientY, dy: 0 };
  tracker.reset(event.clientY);
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  el.style.animation = 'none';
  el.style.transition = 'none';
  if (scrim.value) scrim.value.style.animation = 'none';
}

function move(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id || !sheet.value) return;
  const h = sheet.value.offsetHeight || 400;
  let dy = event.clientY - drag.y0;
  if (dy < 0) dy = rubber(dy, h, 0.25);
  drag.dy = dy;
  tracker.add(event.clientY);
  sheet.value.style.transform = `translateY(${dy}px)`;
  if (scrim.value) {
    scrim.value.style.transition = 'none';
    scrim.value.style.opacity = String(1 - Math.max(0, dy) / h);
  }
}

function up(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id || !sheet.value) return;
  const { dy } = drag;
  drag = null;
  const el = sheet.value;
  const h = el.offsetHeight || 400;
  const v = tracker.velocity(); // px/ms, positif = ke bawah
  if (event.type !== 'pointercancel' && dy + project(v * 1000) > h * 0.35 && v >= -0.05) {
    releaseMs = Math.round(Math.max(140, Math.min(260, (h - dy) / Math.max(v, 0.8))));
    open.value = false;
    return;
  }
  el.style.transition = 'transform 300ms var(--ease-drawer)';
  el.style.transform = 'translateY(0)';
  if (scrim.value) {
    scrim.value.style.transition = 'opacity 200ms ease-out';
    scrim.value.style.opacity = '1';
  }
}
</script>

<template>
  <Teleport to="body">
    <template v-if="rendered">
      <div
        ref="scrim"
        class="ios-scrim fixed inset-0 z-[60] bg-scrim"
        aria-hidden="true"
        @click="open = false"
      />
      <div
        ref="sheet"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="props.title ? titleId : undefined"
        :aria-label="props.title ? undefined : props.label"
        tabindex="-1"
        class="ios-sheet fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom,0px)+8px)] z-[61] mx-auto flex max-h-[80dvh] max-w-[420px] flex-col rounded-[30px] bg-card px-4 pb-[22px] outline-none"
      >
        <div
          class="flex shrink-0 touch-none flex-col"
          @pointerdown="down"
          @pointermove="move"
          @pointerup="up"
          @pointercancel="up"
        >
          <div class="flex cursor-grab justify-center pb-1.5 pt-2" aria-hidden="true">
            <span class="h-[5px] w-9 rounded-full bg-[var(--grabber)]" />
          </div>
          <div v-if="props.title || $slots.header" class="flex items-center gap-2 pb-3 pt-1">
            <b :id="titleId" class="flex-1 text-sheet font-bold tracking-[-0.02em]">{{
              props.title
            }}</b>
            <slot name="header" />
          </div>
        </div>
        <div class="-mx-4 min-h-0 overflow-y-auto overscroll-contain px-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="shrink-0 pt-3.5">
          <slot name="footer" />
        </div>
      </div>
    </template>
  </Teleport>
</template>

<style scoped>
.ios-scrim {
  animation: ios-fade 240ms ease-out;
}
.ios-sheet {
  box-shadow: var(--shadow-sheet);
  animation: ios-up 320ms var(--ease-drawer);
}
@keyframes ios-fade {
  from {
    opacity: 0;
  }
}
@keyframes ios-up {
  from {
    transform: translateY(100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ios-sheet {
    animation: ios-fade 180ms ease-out;
  }
}
</style>
