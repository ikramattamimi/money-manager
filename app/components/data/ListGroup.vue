<script setup lang="ts">
// Judul grup kecil huruf kapital (per hari, per grup akun) + kartu berisi baris
defineProps<{ label: string; aside?: string; asideClass?: string }>();
</script>

<template>
  <section :aria-label="label">
    <div
      class="flex items-baseline justify-between px-2.5 pb-1.5 pt-3.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
    >
      <span>{{ label }}</span>
      <span
        v-if="aside"
        :class="['text-xs normal-case tracking-normal tabular-nums', asideClass]"
        >{{ aside }}</span
      >
    </div>
    <div class="flex flex-col gap-0.5 rounded-card border bg-card p-1 shadow-card">
      <slot />
    </div>
  </section>
</template>
