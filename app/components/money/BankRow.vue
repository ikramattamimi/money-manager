<script setup lang="ts">
import type { Component } from 'vue';
import { Check, Undo2 } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import type { Tone } from '@/components/data/tone';
import { linearFriction, shouldCommit } from '@/lib/gesture';

// Baris mutasi di layar pencocokan. Ketuk untuk memilih kategori/akun, geser
// ke kiri untuk melewati (geser lagi atau ketuk "Pakai" untuk mengembalikan).
// Dalam mode pilih, ketukan menandai baris untuk diubah sekaligus.
const props = defineProps<{
  icon: Component;
  tone: Tone;
  title: string;
  subtitle: string;
  amount: string;
  direction: 'in' | 'out';
  included: boolean;
  /** Mode pilih banyak: lead jadi kotak centang */
  selecting?: boolean;
  selected?: boolean;
  warn?: boolean;
  /** Baris tercatat: hanya dibaca */
  readonly?: boolean;
}>();
const emit = defineEmits<{ open: []; toggle: [] }>();

const row = ref<HTMLElement>();
const offset = ref(0);

const { dragging } = useSwipe(row, {
  axis: 'x',
  canStart: () => !props.readonly && !props.selecting,
  onMove: (dx) => (offset.value = dx > 0 ? linearFriction(dx) : Math.max(dx, -140)),
  onEnd: ({ delta, elapsedMs }) => {
    if (shouldCommit(-delta, 140, elapsedMs, { ratio: 0.5, minFlick: 32 })) emit('toggle');
    offset.value = 0;
  },
});

function tap() {
  if (dragging.value || props.readonly) return;
  emit('open');
}
</script>

<template>
  <div class="relative overflow-hidden rounded-[10px]">
    <div
      v-if="dragging || offset !== 0"
      class="absolute inset-0 flex items-center justify-end gap-1.5 bg-surface-2 pr-4.5 text-meta font-semibold text-muted-foreground"
      aria-hidden="true"
    >
      <template v-if="included">Lewati</template>
      <template v-else><Undo2 class="size-4" />Pakai</template>
    </div>
    <div
      ref="row"
      :class="[
        'relative grid touch-pan-y grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 bg-card px-2.5 py-2',
        !dragging && 'transition-transform duration-[260ms] ease-out',
      ]"
      :style="{ transform: offset ? `translateX(${offset}px)` : undefined }"
    >
      <button
        type="button"
        :class="[
          'press col-span-2 grid grid-cols-subgrid items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg',
          !included && !selecting && 'opacity-45',
          readonly && 'cursor-default',
        ]"
        :aria-pressed="selecting ? selected : undefined"
        :disabled="readonly"
        @click="tap"
      >
        <span
          v-if="selecting"
          :class="[
            'grid size-9 place-items-center rounded-full border-2 transition-colors duration-150',
            selected ? 'border-primary-accent bg-primary-accent text-white' : 'border-border',
          ]"
          aria-hidden="true"
        >
          <Check v-if="selected" class="size-4" />
        </span>
        <ToneIcon v-else :icon="icon" :tone="tone" size="sm" />
        <span class="flex min-w-0 flex-col">
          <b class="truncate text-label font-semibold">{{ title }}</b>
          <small :class="['truncate text-xs', warn ? 'text-warn' : 'text-muted-foreground']">{{
            subtitle
          }}</small>
        </span>
      </button>
      <span class="flex flex-col items-end gap-0.5">
        <b
          :class="[
            'whitespace-nowrap text-label font-bold tabular-nums',
            direction === 'in' ? 'text-primary-accent' : 'text-bad',
            !included && 'opacity-45',
          ]"
          >{{ direction === 'in' ? '+' : '−' }}{{ amount }}</b
        >
        <button
          v-if="!readonly && !selecting"
          type="button"
          class="press rounded-md px-1 text-2xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="emit('toggle')"
        >
          {{ included ? 'Lewati' : 'Pakai' }}
        </button>
      </span>
    </div>
  </div>
</template>
