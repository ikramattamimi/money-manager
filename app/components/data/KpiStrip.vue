<script setup lang="ts">
import { TONE_FILL, type Tone } from './tone';

// Deretan angka ringkas: label (dengan kotak warna opsional), nilai, keterangan
export interface Kpi {
  label: string;
  value: string;
  note?: string;
  tone?: Tone;
}
defineProps<{ items: Kpi[] }>();
</script>

<template>
  <div class="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
    <div
      v-for="item in items"
      :key="item.label"
      class="flex min-w-0 flex-col gap-px rounded-xl bg-surface-2 px-3 py-2"
    >
      <small class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <i
          v-if="item.tone"
          :class="['size-2 shrink-0 rounded-sm', TONE_FILL[item.tone]]"
          aria-hidden="true"
        />
        {{ item.label }}
      </small>
      <b class="truncate text-lg font-bold tabular-nums">{{ item.value }}</b>
      <em v-if="item.note" class="text-xs not-italic text-muted-foreground">{{ item.note }}</em>
    </div>
  </div>
</template>
