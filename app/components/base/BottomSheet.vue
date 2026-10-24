<script setup lang="ts">
import { shouldCommit, sqrtFriction } from '@/lib/gesture';

// Sheet dari bawah untuk HP. Drag 1:1 dari area kosong, gesekan saat ditarik
// ke atas, tutup kalau turun > 30% tinggi atau di-flick. Masuk 280ms, keluar
// 200ms (keluar lebih cepat dari masuk). Esc dan scrim menutup.
const open = defineModel<boolean>('open', { required: true });
const props = defineProps<{ labelledby: string }>();
const emit = defineEmits<{ opened: [] }>();

const sheet = ref<HTMLElement>();
const offset = ref(0);
let lastFocus: HTMLElement | null = null;

const { dragging } = useSwipe(sheet, {
  axis: 'y',
  threshold: 6,
  // Jangan mulai drag dari kontrol, atau dari isi yang sedang digulir
  canStart: (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, button, [data-no-drag]')) return false;
    const body = sheet.value?.querySelector('[data-sheet-body]');
    return !(body?.contains(target) && body.scrollTop > 0);
  },
  onMove: (dy) => (offset.value = dy >= 0 ? dy : sqrtFriction(dy)),
  onEnd: ({ delta, elapsedMs }) => {
    if (
      shouldCommit(delta, sheet.value?.offsetHeight ?? 1, elapsedMs, { ratio: 0.3, minFlick: 24 })
    ) {
      open.value = false;
    }
    offset.value = 0;
  },
});

const scrimOpacity = computed(() =>
  offset.value > 0 ? Math.max(0, 1 - offset.value / (sheet.value?.offsetHeight ?? 1)) : undefined,
);

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}

watch(open, (value) => {
  if (value) {
    lastFocus = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', onKey);
    emit('opened');
  } else {
    document.removeEventListener('keydown', onKey);
    lastFocus?.focus({ preventScroll: true });
  }
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <div
    :class="['scrim fixed inset-0 z-50 bg-scrim', open ? 'is-open' : 'pointer-events-none']"
    :style="{ opacity: scrimOpacity }"
    aria-hidden="true"
    @click="open = false"
  />
  <div
    ref="sheet"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="props.labelledby"
    :aria-hidden="!open"
    :inert="!open"
    :class="[
      'sheet fixed inset-x-0 bottom-0 z-[55] flex max-h-[calc(100%-48px)] touch-none flex-col rounded-t-[20px] border-t bg-card px-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-1.5 shadow-float',
      open && 'is-open',
      dragging && 'is-dragging',
    ]"
    :style="{ transform: offset ? `translateY(${offset}px)` : undefined }"
  >
    <div
      class="mx-auto mb-2 h-1.25 w-9 shrink-0 rounded-full bg-border-strong"
      aria-hidden="true"
    />
    <div data-sheet-body class="touch-pan-y overflow-y-auto [scrollbar-width:none]">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scrim {
  opacity: 0;
  transition: opacity 240ms var(--ease-out);
}
.scrim.is-open {
  opacity: 1;
}
.sheet {
  transform: translateY(100%);
  transition: transform 200ms var(--ease-drawer);
}
.sheet.is-open {
  transform: translateY(0);
  transition-duration: 280ms;
}
.sheet.is-dragging {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .sheet,
  .sheet.is-open {
    transform: none !important;
    transition: opacity 180ms ease;
  }
  .sheet:not(.is-open) {
    opacity: 0;
  }
}
</style>
