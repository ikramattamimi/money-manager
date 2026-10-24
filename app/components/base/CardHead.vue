<script setup lang="ts">
// Kepala kartu: judul panel di kiri, aksi atau keterangan di kanan
defineProps<{ title: string }>();
</script>

<template>
  <div class="flex items-center justify-between gap-3 px-3.5 pb-1 pt-3">
    <span class="text-panel font-bold tracking-tight">{{ title }}</span>
    <slot />
  </div>
</template>
