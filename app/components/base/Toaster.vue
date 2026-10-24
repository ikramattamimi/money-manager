<script setup lang="ts">
// Tempat toast, dipasang sekali di AppShell. Masuk dari bawah lewat
// @starting-style (bisa disela), keluar lebih cepat dari masuk.
const toast = useToast();

function onVisibility() {
  if (document.hidden) toast.pause();
  else if (toast.current.value) toast.schedule();
}
onMounted(() => document.addEventListener('visibilitychange', onVisibility));
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisibility));
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] z-[70] grid justify-items-center md:bottom-8 xl:left-[232px] [&>*]:col-start-1 [&>*]:row-start-1"
    aria-live="polite"
  >
    <Transition name="toast">
      <div
        v-if="toast.current.value"
        :key="toast.current.value.id"
        class="toast pointer-events-auto flex min-h-11 items-center gap-3 rounded-xl bg-foreground py-1.5 pl-3.5 pr-1.5 text-label font-medium text-background shadow-float"
      >
        <span>{{ toast.current.value.text }}</span>
        <button
          v-if="toast.current.value.undo"
          type="button"
          class="press h-8 rounded-lg bg-background/15 px-3 font-bold text-background"
          @click="toast.runUndo()"
        >
          Urungkan
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast {
  transition:
    transform 240ms var(--ease-out),
    opacity 200ms var(--ease-out);
}
@starting-style {
  .toast {
    transform: translateY(12px) scale(0.97);
    opacity: 0;
  }
}
.toast-leave-active {
  transition-duration: 160ms;
}
.toast-leave-to {
  transform: translateY(8px) scale(0.97);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .toast {
    transition-property: opacity;
  }
  .toast-leave-to {
    transform: none;
  }
}
</style>
