<script setup lang="ts">
// Bar simpan impor (mockup .imbar): kaca melayang di bawah layar dengan
// ringkasan di kiri dan tombol di kanan. Di HP duduk di atas tab bar; di
// iPad/desktop menempel di bawah konten. Reduce Transparency: solid.
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
</script>

<template>
  <div
    :class="[
      'imp-bar sticky z-20 mx-3 mt-5 flex items-center gap-3 rounded-[22px] py-2.5 pl-4 pr-2.5',
      embedded
        ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] md:bottom-0'
        : 'bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] md:bottom-4',
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.imp-bar {
  background: var(--glass-bar);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  border: 0.5px solid var(--glass-bar-line);
  box-shadow: var(--glass-bar-shadow);
}
@media (prefers-reduced-transparency: reduce) {
  .imp-bar {
    background: var(--card);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
