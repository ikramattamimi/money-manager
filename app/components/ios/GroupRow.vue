<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';

// Baris grup iOS (mockup .row): ikon opsional, judul + keterangan, nilai
// kanan, chevron. Jadi tautan kalau ada `to`, tombol kalau ada @click,
// selain itu div (mis. berisi saklar). Garis pemisah mulai dari `inset`
// (16px, atau 58px kalau ada ikon). Tekan = latar isian, tanpa skala.
const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    value?: string;
    /** Nilai tebal hitam (nominal), bukan abu */
    strong?: boolean;
    valueTone?: 'inc' | 'exp';
    chevron?: boolean;
    to?: string;
    inset?: number;
  }>(),
  {
    title: '',
    subtitle: undefined,
    value: undefined,
    strong: false,
    valueTone: undefined,
    chevron: false,
    to: undefined,
    inset: undefined,
  },
);
const attrs = useAttrs();
const slots = useSlots();
const NuxtLink = resolveComponent('NuxtLink');

const tag = computed(() => (props.to ? NuxtLink : attrs.onClick ? 'button' : 'div'));
const interactive = computed(() => !!props.to || !!attrs.onClick);
const insetPx = computed(() => props.inset ?? (slots.icon ? 58 : 16));
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :type="tag === 'button' ? 'button' : undefined"
    :style="{ '--inset': `${insetPx}px` }"
    :class="[
      'ios-row relative flex min-h-12 w-full items-center gap-3 py-2 pl-4 pr-3.5 text-left',
      interactive && 'ios-row-press',
    ]"
  >
    <slot name="icon" />
    <span class="flex min-w-0 flex-1 flex-col">
      <slot>
        <b class="truncate text-row font-medium tracking-[-0.01em]">{{ title }}</b>
        <span v-if="subtitle" class="truncate text-meta text-muted-foreground">{{ subtitle }}</span>
      </slot>
    </span>
    <slot name="value">
      <span
        v-if="value"
        :class="[
          'shrink-0 whitespace-nowrap text-row',
          strong || valueTone ? 'font-semibold' : 'text-muted-foreground',
          valueTone === 'inc' && 'text-inc',
          valueTone === 'exp' && 'text-exp',
        ]"
        >{{ value }}</span
      >
    </slot>
    <slot name="end" />
    <ChevronRight
      v-if="chevron"
      class="size-[18px] shrink-0 text-chevron -mr-1"
      stroke-width="2.6"
      aria-hidden="true"
    />
  </component>
</template>

<style scoped>
.ios-row + .ios-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: var(--inset);
  height: 0.5px;
  background: var(--sep);
}
.ios-row-press {
  transition: background-color 120ms ease;
}
.ios-row-press:active {
  background: var(--fill-press);
}
</style>
