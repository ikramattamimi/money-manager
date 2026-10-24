<script setup lang="ts">
// Angka utama di dalam kepala halaman, dengan progres opsional (0–1)
const props = defineProps<{
  label: string;
  value: string;
  progress?: { label: string; value: number };
}>();

const pct = computed(() => Math.min(1, Math.max(0, props.progress?.value ?? 0)));
</script>

<template>
  <div class="flex flex-col gap-0.5 px-0.5 pt-0.5">
    <small class="text-xs text-on-grad-2">{{ label }}</small>
    <b class="text-[30px] font-bold leading-[1.1] tracking-[-0.025em] tabular-nums md:text-[34px]">
      {{ value }}
    </b>
    <div v-if="progress" class="mt-2 flex flex-col gap-1.5">
      <div class="flex justify-between text-xs text-on-grad-2">
        <span>{{ progress.label }}</span>
        <b class="font-semibold tabular-nums text-on-grad">{{ Math.round(pct * 100) }}%</b>
      </div>
      <div
        class="h-1.5 overflow-hidden rounded-full bg-glass-shade"
        role="progressbar"
        :aria-label="progress.label"
        :aria-valuenow="Math.round(pct * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="block h-full origin-left rounded-full bg-on-grad transition-transform duration-300 ease-out"
          :style="{ transform: `scaleX(${pct})` }"
        />
      </div>
    </div>
  </div>
</template>
