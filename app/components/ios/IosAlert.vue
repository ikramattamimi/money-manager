<script setup lang="ts">
// Dialog peringatan iOS (mockup .ialert): kaca tebal di tengah, masuk dari
// scale(1,08) + opacity 220ms ease-out (seperti UIAlertController), keluar
// tanpa animasi. Fokus awal di Batal supaya Enter tidak merusak data.
const alert = useAlert();
const cancelBtn = ref<HTMLButtonElement>();

const dialog = ref<HTMLElement>();
let lastFocus: HTMLElement | null = null;

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') alert.answer(false);
  else if (event.key === 'Tab') {
    // Fokus berputar di dua tombol dialog
    const btns = [...(dialog.value?.querySelectorAll<HTMLElement>('button') ?? [])];
    const first = btns[0];
    const last = btns[btns.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (!dialog.value?.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }
}
watch(
  () => alert.current.value?.id,
  (id) => {
    if (id) {
      // Fokus asal disimpan sekali; dialog berurutan tetap kembali ke kontrol semula
      if (!lastFocus) lastFocus = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', onKey);
      nextTick(() => cancelBtn.value?.focus());
    } else {
      document.removeEventListener('keydown', onKey);
      lastFocus?.focus({ preventScroll: true });
      lastFocus = null;
    }
  },
);
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <template v-if="alert.current.value">
    <div class="ios-alert-scrim fixed inset-0 z-[90] bg-scrim" aria-hidden="true" />
    <div
      :key="alert.current.value.id"
      ref="dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ios-alert-title"
      :aria-describedby="alert.current.value.body ? 'ios-alert-body' : undefined"
      class="ios-alert fixed left-1/2 top-1/2 z-[91] w-[272px] overflow-hidden rounded-2xl text-center"
    >
      <b id="ios-alert-title" class="block px-4 pb-[3px] pt-[19px] text-bar font-semibold">{{
        alert.current.value.title
      }}</b>
      <p
        v-if="alert.current.value.body"
        id="ios-alert-body"
        class="m-0 px-4 pb-[18px] pt-0.5 text-meta leading-[1.4]"
      >
        {{ alert.current.value.body }}
      </p>
      <div v-else class="h-4" />
      <div class="ios-alert-btns grid grid-cols-2">
        <button
          ref="cancelBtn"
          type="button"
          class="h-11 text-bar text-[var(--alert-link)] active:bg-[var(--glass-press)]"
          @click="alert.answer(false)"
        >
          Batal
        </button>
        <button
          type="button"
          :class="[
            'h-11 text-bar active:bg-[var(--glass-press)]',
            alert.current.value.danger
              ? 'font-semibold text-[var(--alert-danger)]'
              : 'font-semibold text-[var(--alert-link)]',
          ]"
          @click="alert.answer(true)"
        >
          {{ alert.current.value.okLabel }}
        </button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.ios-alert {
  transform: translate(-50%, -50%);
  background: var(--alert-bg);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  animation: ios-alert-in 220ms var(--ease-out);
}
.ios-alert-scrim {
  animation: ios-fade 200ms ease-out;
}
.ios-alert-btns {
  box-shadow: inset 0 0.5px 0 var(--glass-menu-line);
}
.ios-alert-btns > button + button {
  box-shadow: inset 0.5px 0 0 var(--glass-menu-line);
}
@keyframes ios-alert-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.08);
  }
}
@keyframes ios-fade {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ios-alert {
    animation: ios-fade 180ms ease-out;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .ios-alert {
    background: var(--glass-menu-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
