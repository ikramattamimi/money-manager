<script setup lang="ts">
import type { Component } from 'vue';
import { ChevronDown, ChevronUp } from '@lucide/vue';
import { TONE_TEXT, type Tone } from './tone';

export interface GridItem {
  id: string;
  label: string;
  icon?: Component;
  tone?: Tone;
  /** Keterangan kecil di bawah nama, mis. "umum" atau "diarsipkan" */
  hint?: string;
  disabled?: boolean;
  /** Ada isi = sel ini membuka anaknya di baris bawahnya, bukan dipilih */
  children?: GridItem[];
}

// Grid pilihan gaya Realbyte Money Manager: 3 kolom, sel induk membuka
// anak-anaknya di bawah barisnya (kategori → subkategori, grup → akun).
const props = withDefaults(
  defineProps<{ items: GridItem[]; modelValue: string; label: string; columns?: number }>(),
  { columns: 3 },
);
const emit = defineEmits<{ select: [id: string] }>();

const hasChildren = (item: GridItem) => !!item.children?.length;

// Buka induk yang berisi pilihan sekarang; kalau tidak ada, induk pertama
function initialExpanded() {
  const holder = props.items.find((i) => i.children?.some((c) => c.id === props.modelValue));
  return holder?.id ?? props.items.find(hasChildren)?.id ?? null;
}
const expanded = ref<string | null>(initialExpanded());

const rows = computed(() => {
  const out: GridItem[][] = [];
  for (let i = 0; i < props.items.length; i += props.columns)
    out.push(props.items.slice(i, i + props.columns));
  return out;
});

function tap(item: GridItem) {
  if (item.disabled) return;
  if (hasChildren(item)) expanded.value = expanded.value === item.id ? null : item.id;
  else emit('select', item.id);
}

const isSelected = (item: GridItem) =>
  item.id === props.modelValue || !!item.children?.some((c) => c.id === props.modelValue);

const CELL =
  'press flex min-h-11 min-w-0 flex-col items-center justify-center gap-px px-1.5 py-1.5 text-center text-[13px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-35';
</script>

<template>
  <div role="group" :aria-label="label" class="flex flex-col gap-px bg-border">
    <template v-for="(row, r) in rows" :key="r">
      <div
        class="grid gap-px"
        :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
      >
        <button
          v-for="item in row"
          :key="item.id"
          type="button"
          :disabled="item.disabled"
          :aria-pressed="hasChildren(item) ? undefined : item.id === modelValue"
          :aria-expanded="hasChildren(item) ? expanded === item.id : undefined"
          :class="[
            CELL,
            expanded === item.id ? 'bg-surface-2' : 'bg-card hover:bg-surface-2',
            isSelected(item) ? 'font-semibold text-primary-accent' : 'text-foreground',
          ]"
          @click="tap(item)"
        >
          <span class="flex max-w-full items-center gap-1">
            <component
              :is="item.icon"
              v-if="item.icon"
              :class="['size-3.5 shrink-0', TONE_TEXT[item.tone ?? 'neutral']]"
              aria-hidden="true"
            />
            <span class="line-clamp-2 break-words">{{ item.label }}</span>
          </span>
          <small v-if="item.hint" class="text-2xs font-normal text-muted-foreground">{{
            item.hint
          }}</small>
          <component
            :is="expanded === item.id ? ChevronUp : ChevronDown"
            v-if="hasChildren(item)"
            class="size-3 text-faint"
            aria-hidden="true"
          />
        </button>
        <!-- Sisa sel kosong supaya garis grid tetap rapi -->
        <span
          v-for="n in columns - row.length"
          :key="`pad-${n}`"
          class="bg-card"
          aria-hidden="true"
        />
      </div>

      <template v-for="item in row" :key="`children-${item.id}`">
        <div
          v-if="expanded === item.id && item.children?.length"
          class="grid gap-px"
          :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
          role="group"
          :aria-label="item.label"
        >
          <button
            v-for="child in item.children"
            :key="child.id"
            type="button"
            :disabled="child.disabled"
            :aria-pressed="child.id === modelValue"
            :class="[
              CELL,
              'bg-surface-2 hover:bg-card',
              child.id === modelValue ? 'font-semibold text-primary-accent' : 'text-foreground',
            ]"
            @click="tap(child)"
          >
            <span class="flex max-w-full items-center gap-1">
              <component
                :is="child.icon"
                v-if="child.icon"
                :class="['size-3.5 shrink-0', TONE_TEXT[child.tone ?? 'neutral']]"
                aria-hidden="true"
              />
              <span class="line-clamp-2 break-words">{{ child.label }}</span>
            </span>
            <small v-if="child.hint" class="text-2xs font-normal text-muted-foreground">{{
              child.hint
            }}</small>
          </button>
          <span
            v-for="n in (columns - (item.children.length % columns)) % columns"
            :key="`pad-${n}`"
            class="bg-surface-2"
            aria-hidden="true"
          />
        </div>
      </template>
    </template>
  </div>
</template>
