<script setup lang="ts">
// Tombol kaca kecil di kepala halaman. Tanpa slot teks = tombol ikon (wajib label).
defineProps<{ label?: string }>();
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    class="press press-icon inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border border-glass-line bg-glass px-2 text-meta font-semibold text-on-grad hover:bg-glass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-grad [&_svg]:size-4"
  >
    <slot />
  </button>
</template>
