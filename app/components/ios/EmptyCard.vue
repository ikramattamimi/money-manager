<script setup lang="ts">
// Keadaan kosong (mockup .empty): kartu di tengah dengan judul, penjelasan,
// dan aksi opsional di slot default.
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div
    class="mx-4 my-6 flex flex-col items-center gap-2 rounded-card bg-card px-[18px] py-7 text-center"
  >
    <b class="text-row font-semibold">{{ title }}</b>
    <p v-if="description" class="m-0 text-[14px] text-muted-foreground">{{ description }}</p>
    <slot />
  </div>
</template>
