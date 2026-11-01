<script setup lang="ts">
import { Camera, FileText, Plus, Star, Type } from '@lucide/vue';

// Tombol + (mockup .fab) di samping tab bar. Ketuk = catat transaksi.
// Tahan 450ms (atau klik kanan) = menu catat cepat (mockup .qmenu) yang
// membesar dari pojok tombol 200ms; klik setelah tahan diabaikan. Getar
// singkat kalau perangkat mendukung. Esc/scrim menutup, keluar 150ms.
export type QuickAction = 'bookmark' | 'quick' | 'bank' | 'photo';

const emit = defineEmits<{ press: []; quick: [action: QuickAction] }>();

const ITEMS = [
  { key: 'bookmark', label: 'Dari bookmark', icon: Star },
  { key: 'quick', label: 'Ketik cepat', icon: Type },
  { key: 'bank', label: 'Mutasi bank', icon: FileText },
  { key: 'photo', label: 'Foto struk', icon: Camera },
] as const;

const menuOpen = ref(false);
const closing = ref(false);
const menu = ref<HTMLElement>();
const fab = ref<HTMLButtonElement>();
let pressTimer: ReturnType<typeof setTimeout> | undefined;
let longFired = false;

function openMenu() {
  longFired = true;
  navigator.vibrate?.(8);
  closing.value = false;
  menuOpen.value = true;
  document.addEventListener('keydown', onKey);
  nextTick(() => menu.value?.querySelector<HTMLButtonElement>('button')?.focus());
}

function closeMenu(then?: () => void) {
  document.removeEventListener('keydown', onKey);
  closing.value = true;
  setTimeout(() => {
    menuOpen.value = false;
    closing.value = false;
    if (then) then();
    else fab.value?.focus({ preventScroll: true });
  }, 150);
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu();
}

function down(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  clearTimeout(pressTimer);
  longFired = false;
  pressTimer = setTimeout(openMenu, 450);
}
function cancelPress() {
  clearTimeout(pressTimer);
}
function click() {
  if (longFired) {
    longFired = false;
    return;
  }
  emit('press');
}
function contextMenu(event: Event) {
  event.preventDefault();
  if (!menuOpen.value) openMenu();
}
function pick(action: QuickAction) {
  closeMenu(() => emit('quick', action));
}

onBeforeUnmount(() => {
  clearTimeout(pressTimer);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <button
    ref="fab"
    type="button"
    aria-label="Catat transaksi. Tahan untuk pilihan cepat"
    aria-haspopup="menu"
    :aria-expanded="menuOpen"
    class="ios-fab fixed bottom-[calc(env(safe-area-inset-bottom,0px)+19px)] right-3.5 z-40 grid size-[58px] place-items-center rounded-full bg-primary text-primary-foreground active:scale-[0.92] md:bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] md:right-6 lg:hidden"
    @pointerdown="down"
    @pointerup="cancelPress"
    @pointerleave="cancelPress"
    @pointercancel="cancelPress"
    @click="click"
    @contextmenu="contextMenu"
  >
    <Plus class="size-[26px]" stroke-width="2.6" aria-hidden="true" />
  </button>

  <template v-if="menuOpen">
    <div class="fixed inset-0 z-40" aria-hidden="true" @click="closeMenu()" />
    <div
      ref="menu"
      role="menu"
      aria-label="Catat cepat"
      :class="[
        'ios-qmenu fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-3.5 z-[41] min-w-[224px] overflow-hidden rounded-[14px] md:bottom-[calc(env(safe-area-inset-bottom,0px)+94px)] md:right-6',
        closing && 'is-closing',
      ]"
    >
      <button
        v-for="item in ITEMS"
        :key="item.key"
        type="button"
        role="menuitem"
        class="flex h-12 w-full items-center justify-between gap-3 px-4 text-bar active:bg-[var(--glass-press)]"
        @click="pick(item.key)"
      >
        {{ item.label }}
        <component :is="item.icon" class="size-5" stroke-width="2.2" aria-hidden="true" />
      </button>
    </div>
  </template>
</template>

<style scoped>
.ios-fab {
  box-shadow: var(--fab-shadow);
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
  transition:
    transform 160ms var(--ease-out),
    opacity 160ms var(--ease-out);
}
@starting-style {
  .ios-fab {
    opacity: 0;
    transform: scale(0.9);
  }
}
.ios-qmenu {
  background: var(--glass-menu);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  box-shadow:
    var(--shadow-menu),
    0 0 0 0.5px var(--glass-menu-line);
  /* Membesar dari pojok tombol + di bawahnya */
  transform-origin: calc(100% - 29px) calc(100% + 40px);
  transition:
    transform 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}
@starting-style {
  .ios-qmenu {
    opacity: 0;
    transform: scale(0.95);
  }
}
.ios-qmenu.is-closing {
  opacity: 0;
  transform: scale(0.95);
  transition-duration: 150ms;
}
.ios-qmenu button + button {
  box-shadow: inset 0 0.5px 0 var(--glass-menu-line);
}
@media (prefers-reduced-motion: reduce) {
  .ios-fab {
    transition: opacity 160ms ease;
  }
  .ios-qmenu,
  .ios-qmenu.is-closing {
    transform: none;
    transition: opacity 150ms ease;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .ios-qmenu {
    background: var(--glass-menu-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
