<script setup lang="ts" generic="T extends { id: string }">
import { GripVertical } from '@lucide/vue';

// Daftar yang bisa diurutkan dengan menyeret pegangan di kanan baris.
// Baris yang diseret mengikuti jari 1:1; baris lain bergeser memberi tempat.
// Lepas = urutan baru dikirim lewat `reorder`. Keyboard: Alt + panah atas/bawah
// pada pegangan.
const props = defineProps<{ items: T[]; label: string }>();
const emit = defineEmits<{ reorder: [ids: string[]] }>();

const list = ref<HTMLElement>();
const dragIndex = ref<number | null>(null);
const offset = ref(0);
const rowHeight = ref(0);
let pointer: number | null = null;
let startY = 0;

const target = computed(() => {
  if (dragIndex.value === null || !rowHeight.value) return null;
  const moved = Math.round(offset.value / rowHeight.value);
  return Math.min(props.items.length - 1, Math.max(0, dragIndex.value + moved));
});

function shiftFor(index: number) {
  const from = dragIndex.value;
  const to = target.value;
  if (from === null || to === null || index === from) return 0;
  if (from < to && index > from && index <= to) return -rowHeight.value;
  if (from > to && index < from && index >= to) return rowHeight.value;
  return 0;
}

function down(event: PointerEvent, index: number) {
  if (pointer !== null) return;
  const row = (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-row]');
  if (!row) return;
  pointer = event.pointerId;
  startY = event.clientY;
  rowHeight.value = row.offsetHeight + 2; // gap-0.5
  dragIndex.value = index;
  offset.value = 0;
  try {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  } catch {
    // pointer sintetis
  }
}

function move(event: PointerEvent) {
  if (event.pointerId !== pointer) return;
  offset.value = event.clientY - startY;
}

function up(event: PointerEvent) {
  if (event.pointerId !== pointer) return;
  pointer = null;
  const from = dragIndex.value;
  const to = target.value;
  dragIndex.value = null;
  offset.value = 0;
  if (from === null || to === null || from === to) return;
  emit('reorder', reorder(from, to));
}

function reorder(from: number, to: number) {
  const ids = props.items.map((i) => i.id);
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved!);
  return ids;
}

function onKey(event: KeyboardEvent, index: number) {
  if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
  event.preventDefault();
  const to = index + (event.key === 'ArrowUp' ? -1 : 1);
  if (to < 0 || to >= props.items.length) return;
  focusId = props.items[index]!.id;
  emit('reorder', reorder(index, to));
}

// Urutan baru datang asinkron (optimistic update di cache), jadi fokus
// dikembalikan ke pegangan baris yang sama setelah daftar benar-benar berubah.
let focusId: string | null = null;
watch(
  () => props.items.map((i) => i.id).join(),
  () => {
    if (!focusId) return;
    list.value?.querySelector<HTMLElement>(`[data-handle="${focusId}"]`)?.focus();
    focusId = null;
  },
  { flush: 'post' },
);
</script>

<template>
  <div ref="list" class="flex flex-col gap-0.5" role="list" :aria-label="label">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      data-row
      role="listitem"
      :class="[
        'relative flex items-center rounded-[10px] bg-card',
        dragIndex === index
          ? 'z-10 shadow-float'
          : dragIndex !== null && 'transition-transform duration-200 ease-out',
      ]"
      :style="{
        transform:
          dragIndex === index
            ? `translateY(${offset}px) scale(1.01)`
            : `translateY(${shiftFor(index)}px)`,
      }"
    >
      <div class="min-w-0 flex-1"><slot :item="item" /></div>
      <button
        type="button"
        :data-handle="item.id"
        :aria-label="`Urutkan ${index + 1} dari ${items.length}. Alt + panah untuk memindah.`"
        class="grid size-11 shrink-0 cursor-grab touch-none place-items-center text-faint active:cursor-grabbing"
        @pointerdown="down($event, index)"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
        @keydown="onKey($event, index)"
      >
        <GripVertical class="size-4.5" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
