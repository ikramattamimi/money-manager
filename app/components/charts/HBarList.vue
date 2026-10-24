<script setup lang="ts">
import type { Component } from 'vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import Meter from '@/components/data/Meter.vue';
import type { Tone } from '@/components/data/tone';

// Daftar batang mendatar berperingkat: ikon, nama + persen, batang, nilai.
// Lebar batang relatif terhadap nilai terbesar.
export interface HBarItem {
  id: string;
  label: string;
  value: number;
  display: string;
  icon: Component;
  tone: Tone;
}
const props = defineProps<{ items: HBarItem[] }>();

const max = computed(() => Math.max(1, ...props.items.map((i) => i.value)));
const total = computed(() => props.items.reduce((s, i) => s + i.value, 0) || 1);
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <div
      v-for="item in items"
      :key="item.id"
      class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-1.5"
    >
      <ToneIcon :icon="item.icon" :tone="item.tone" size="sm" />
      <span class="flex min-w-0 flex-col gap-1.5">
        <b class="truncate text-meta font-semibold">
          {{ item.label }}
          <span class="font-medium tabular-nums text-faint"
            >{{ Math.round((item.value / total) * 100) }}%</span
          >
        </b>
        <Meter :value="item.value / max" :tone="item.tone" :label="item.label" />
      </span>
      <b class="text-meta font-bold tabular-nums">{{ item.display }}</b>
    </div>
  </div>
</template>
