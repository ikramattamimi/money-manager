<script setup lang="ts">
import { ChevronUp } from '@lucide/vue';

// Bar judul ringkas Liquid Glass: muncul setelah pita PageHeader tergulir
// keluar (HP dan desktop; di iPad tempat itu dipakai tab bar). Memudar hanya
// karena gulir; saat pindah halaman langsung menyesuaikan tanpa animasi.
const compact = useCompactHeader();
const route = useRoute();
const instant = ref(false);

watch(
  () => route.path,
  () => {
    instant.value = true;
    requestAnimationFrame(() => requestAnimationFrame(() => (instant.value = false)));
  },
);

function toTop() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
</script>

<template>
  <div
    :aria-hidden="!compact.visible.value"
    :inert="!compact.visible.value"
    :class="[
      'bar lg fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+8px)] z-30 flex h-11 items-center gap-2 rounded-[22px] pl-4 pr-1.5 md:hidden xl:left-[260px] xl:right-7 xl:top-3 xl:flex',
      compact.visible.value && 'is-visible',
      instant && 'is-instant',
    ]"
  >
    <b class="flex-1 truncate text-[15px] font-bold">{{ compact.title.value }}</b>
    <span
      v-if="compact.summary.value"
      class="text-meta font-semibold tabular-nums text-muted-foreground"
    >
      {{ compact.summary.value }}
    </span>
    <button
      type="button"
      class="press press-icon grid size-8.5 place-items-center rounded-full"
      aria-label="Kembali ke atas"
      @click="toTop"
    >
      <ChevronUp class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.bar {
  opacity: 0;
  transform: translateY(-6px);
  pointer-events: none;
  transition:
    opacity 160ms var(--ease-out),
    transform 200ms var(--ease-out);
}
.bar.is-visible {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.bar.is-instant {
  transition: none;
}
</style>
