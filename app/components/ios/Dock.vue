<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';

// Panel bawah gaya keyboard iOS (mockup .dock/.dockh/.dockb) untuk papan
// angka, grid kategori/akun, dan kalender. Hanya kemunculan pertama yang
// meluncur (280ms kurva drawer); ganti isi tanpa animasi karena dipakai
// puluhan kali sehari. `steps` = titik langkah alur Nominal → Kategori → Akun.
withDefaults(
  defineProps<{
    title: string;
    hint?: string;
    steps?: { count: number; active: number };
    /** Tinggi mengikuti isi, bukan setinggi papan angka (301px) */
    auto?: boolean;
  }>(),
  { hint: '', steps: undefined, auto: false },
);
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div
    class="ios-dock fixed inset-x-0 bottom-0 z-[45] bg-[var(--kb-bg)] pb-[env(safe-area-inset-bottom,0px)]"
    role="group"
    :aria-label="title"
  >
    <div
      class="flex h-11 items-center gap-1.5 bg-[var(--kb-head)] pl-4 pr-1 shadow-[inset_0_-0.5px_0_var(--kb-head-line)]"
    >
      <b class="text-body font-semibold">{{ title }}</b>
      <span class="min-w-0 flex-1 truncate text-note font-medium text-muted-foreground">{{
        hint
      }}</span>
      <span v-if="steps" class="flex items-center gap-1" aria-hidden="true">
        <i
          v-for="n in steps.count"
          :key="n"
          :class="[
            'block h-1.5 rounded-full',
            n - 1 === steps.active ? 'w-4 bg-primary-accent' : 'w-1.5 bg-[var(--kb-shadow)]/50',
          ]"
        />
      </span>
      <slot name="actions" />
      <button
        type="button"
        aria-label="Tutup panel"
        class="grid size-11 place-items-center rounded-xl active:bg-fill-press"
        @click="emit('close')"
      >
        <ChevronDown class="size-5" stroke-width="2.2" aria-hidden="true" />
      </button>
    </div>
    <div
      :class="[
        'overflow-y-auto overscroll-contain [scrollbar-width:none]',
        auto ? 'h-auto' : 'h-[301px]',
      ]"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ios-dock {
  animation: ios-up 280ms var(--ease-drawer);
}
@keyframes ios-up {
  from {
    transform: translateY(100%);
  }
}
</style>
