<script setup lang="ts">
// Dialog di tengah layar (form sheet iPad). Masuk 240ms dari scale(0.98) +
// opacity, keluar 150ms. Modal tetap transform-origin tengah. Esc dan scrim menutup.
const open = defineModel<boolean>('open', { required: true });
const props = defineProps<{ labelledby: string }>();
const emit = defineEmits<{ opened: [] }>();

let lastFocus: HTMLElement | null = null;
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
    aria-hidden="true"
    @click="open = false"
  />
  <div
    role="dialog"
    aria-modal="true"
    :aria-labelledby="props.labelledby"
    :aria-hidden="!open"
    :inert="!open"
    :class="[
      'dialog fixed left-1/2 top-1/2 z-[55] max-h-[min(720px,calc(100%-96px))] w-[480px] overflow-y-auto rounded-[20px] border bg-card px-3.5 pb-4 pt-3 shadow-float',
      open && 'is-open',
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.scrim {
  opacity: 0;
  transition: opacity 200ms var(--ease-out);
}
.scrim.is-open {
  opacity: 1;
}
.dialog {
  opacity: 0;
  transform: translate(-50%, -46%) scale(0.98);
  transition:
    transform 150ms var(--ease-out),
    opacity 150ms var(--ease-out);
}
.dialog.is-open {
  opacity: 1;
  transform: translate(-50%, -50%);
  transition-duration: 240ms, 200ms;
}
@media (prefers-reduced-motion: reduce) {
  .dialog,
  .dialog.is-open {
    transform: translate(-50%, -50%);
  }
}
</style>
