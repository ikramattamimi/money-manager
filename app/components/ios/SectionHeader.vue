<script setup lang="ts">
// Judul grup iOS di atas GroupedList (mockup .sh): huruf kapital kecil abu,
// isi kanan opsional (total, atau tautan aksen lewat slot #aside).
defineProps<{ label: string; aside?: string }>();
</script>

<template>
  <div
    class="flex items-baseline justify-between gap-3 px-8 pb-[7px] pt-[18px] text-meta uppercase tracking-[0.02em] text-muted-foreground"
  >
    <span class="truncate">{{ label }}</span>
    <slot name="aside">
      <span v-if="aside" class="shrink-0 normal-case">{{ aside }}</span>
    </slot>
  </div>
</template>
