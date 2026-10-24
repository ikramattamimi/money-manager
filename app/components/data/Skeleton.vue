<script setup lang="ts">
// Placeholder baris saat memuat. Tanpa shimmer bergerak (beban mata, dan
// pemuatan biasanya singkat); cukup kotak abu-abu yang sedikit berdenyut.
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });
</script>

<template>
  <div class="flex flex-col gap-0.5" aria-busy="true" aria-label="Memuat">
    <div
      v-for="n in rows"
      :key="n"
      class="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2.5 py-2.5"
    >
      <span class="size-9 animate-pulse rounded-[10px] bg-surface-2" />
      <span class="flex flex-col gap-1.5">
        <span class="h-3 w-2/5 animate-pulse rounded bg-surface-2" />
        <span class="h-2.5 w-1/4 animate-pulse rounded bg-surface-2" />
      </span>
      <span class="h-3 w-16 animate-pulse rounded bg-surface-2" />
    </div>
  </div>
</template>
