<script setup lang="ts">
import type { GridItem } from '@/components/data/GridPicker.vue';
import { TONE_TEXT } from '@/components/data/tone';

// Grid pilihan kategori/akun di panel bawah (mockup .cgrid/.gc/.subrow):
// 4 kolom bergaya tombol keyboard. Sel yang punya anak membuka baris anaknya
// tepat di bawah barisnya; grup akun berisi satu akun langsung memilih akun
// itu. Ganti isi tanpa animasi.
const props = defineProps<{ items: GridItem[]; modelValue: string; label: string }>();
const emit = defineEmits<{ select: [id: string] }>();

const COLS = 4;
const holderOf = (id: string) => props.items.find((i) => i.children?.some((c) => c.id === id));
// Buka induk berisi pilihan sekarang kalau anaknya lebih dari satu
const open = ref<string | null>(
  (() => {
    const h = holderOf(props.modelValue);
    return h && (h.children?.length ?? 0) > 1 ? h.id : null;
  })(),
);

const rows = computed(() => {
  const out: GridItem[][] = [];
  for (let i = 0; i < props.items.length; i += COLS) out.push(props.items.slice(i, i + COLS));
  return out;
});
const openItem = computed(() => props.items.find((i) => i.id === open.value));

function tap(item: GridItem) {
  if (item.disabled) return;
  const kids = item.children ?? [];
  if (kids.length === 1 && !kids[0]!.disabled) return emit('select', kids[0]!.id);
  if (kids.length) {
    open.value = open.value === item.id ? null : item.id;
    return;
  }
  emit('select', item.id);
}
const selected = (item: GridItem) =>
  item.id === props.modelValue || !!item.children?.some((c) => c.id === props.modelValue);
/** Nama anak terpilih di bawah nama grup (mis. akun terpilih di grup Bank) */
const pickedChild = (item: GridItem) =>
  item.children && item.children.length > 1
    ? item.children.find((c) => c.id === props.modelValue)?.label
    : undefined;
</script>

<template>
  <div class="grid grid-cols-4 gap-1.5 px-1.5 pb-[30px] pt-[7px]" role="group" :aria-label="label">
    <template v-for="(row, r) in rows" :key="r">
      <button
        v-for="item in row"
        :key="item.id"
        type="button"
        :disabled="item.disabled"
        :aria-pressed="selected(item)"
        :aria-expanded="item.children && item.children.length > 1 ? open === item.id : undefined"
        :class="[
          'grid-cell flex min-h-[64px] flex-col items-center justify-center gap-[5px] rounded-[9px] px-0.5 pb-2 pt-[9px] text-center text-xs font-medium shadow-[0_1px_0_var(--kb-shadow)] active:scale-95 disabled:opacity-35',
          open === item.id ? 'bg-primary-soft' : 'bg-[var(--kb-key)]',
          selected(item) && 'ring-2 ring-primary-accent',
        ]"
        @click="tap(item)"
      >
        <component
          :is="item.icon"
          v-if="item.icon"
          :class="['size-6', TONE_TEXT[item.tone ?? 'neutral']]"
          stroke-width="1.9"
          aria-hidden="true"
        />
        <span class="line-clamp-2 leading-tight">{{ item.label }}</span>
        <span
          v-if="pickedChild(item) || item.hint"
          class="-mt-0.5 max-w-full truncate px-1 text-[10.5px] text-muted-foreground"
          >{{ pickedChild(item) ?? item.hint }}</span
        >
      </button>
      <div
        v-if="openItem && row.some((i) => i.id === open)"
        class="col-span-4 grid grid-cols-4 gap-1.5 rounded-[11px] bg-[var(--kb-sub)] p-1.5"
      >
        <button
          v-for="child in openItem.children"
          :key="child.id"
          type="button"
          :disabled="child.disabled"
          :aria-pressed="child.id === modelValue"
          :class="[
            'grid-cell rounded-[9px] bg-[var(--kb-key)] px-0.5 py-3 text-center text-xs font-medium shadow-[0_1px_0_var(--kb-shadow)] active:scale-95 disabled:opacity-35',
            child.id === modelValue && 'ring-2 ring-primary-accent',
          ]"
          @click="emit('select', child.id)"
        >
          <span class="line-clamp-2 leading-tight">{{
            child.hint === 'umum' ? `${child.label} (umum)` : child.label
          }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.grid-cell {
  transition: transform 100ms ease-out;
}
</style>
