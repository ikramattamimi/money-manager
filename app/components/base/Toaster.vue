<script setup lang="ts">
// Tempat toast, dipasang sekali di AppShell (mockup .toast): kaca gelap di
// atas layar, turun dari atas lewat @starting-style (300ms ease-out, bisa
// disela), naik keluar 160ms. Di bawah tidak ada yang tertutup (tab bar, +).
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
    class="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top,0px)+10px)] z-[80] grid justify-items-center xl:left-[232px] [&>*]:col-start-1 [&>*]:row-start-1"
    aria-live="polite"
  >
    <Transition name="toast">
      <div
        v-if="toast.current.value"
        :key="toast.current.value.id"
        class="toast pointer-events-auto flex min-h-[52px] w-full max-w-[420px] items-center gap-2.5 rounded-2xl py-2.5 pl-4 pr-2.5 text-label font-semibold"
      >
        <span class="flex-1">{{ toast.current.value.text }}</span>
        <button
          v-if="toast.current.value.undo"
          type="button"
          class="relative h-8 shrink-0 rounded-[9px] bg-[color-mix(in_srgb,var(--toast-fg)_16%,transparent)] px-3 text-label font-semibold text-[var(--toast-fg)] active:scale-95"
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
  background: var(--toast-bg);
  color: var(--toast-fg);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-float);
  transition:
    transform 300ms var(--ease-out),
    opacity 300ms var(--ease-out);
}
.toast button {
  transition: transform 120ms var(--ease-out);
}
/* Area ketuk 44px; tampilannya tetap 32px */
.toast button::after {
  content: '';
  position: absolute;
  inset: -6px -4px;
}
@starting-style {
  .toast {
    transform: translateY(-140%);
    opacity: 0;
  }
}
.toast-leave-active {
  transition-duration: 160ms;
}
.toast-leave-to {
  transform: translateY(-140%);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .toast {
    transition-property: opacity;
    transition-duration: 180ms;
  }
  .toast-leave-to {
    transform: none;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .toast {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
