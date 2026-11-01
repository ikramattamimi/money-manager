<script setup lang="ts">
import { Delete } from '@lucide/vue';
import type { CalcKey } from '@/features/transactions/calculator';

// Papan angka gaya keyboard iOS (mockup .keys/.key): 4 kolom, + − × ÷ di
// kanan, "=" setinggi dua baris yang berganti jadi "Lanjut" kalau tidak ada
// operasi. Tekan: latar gelap + skala 0,96, 80ms. Tanpa animasi lain.
const props = defineProps<{ hasOperator: boolean }>();
const emit = defineEmits<{ press: [key: CalcKey] }>();

const KEYS: {
  k: CalcKey;
  cls: 'num' | 'fn' | 'op' | 'eq';
  col: number;
  row: number;
  aria?: string;
}[] = [
  { k: 'C', cls: 'fn', col: 1, row: 1, aria: 'Hapus semua' },
  { k: '÷', cls: 'op', col: 2, row: 1, aria: 'Bagi' },
  { k: '×', cls: 'op', col: 3, row: 1, aria: 'Kali' },
  { k: 'del', cls: 'fn', col: 4, row: 1, aria: 'Hapus satu angka' },
  { k: '7', cls: 'num', col: 1, row: 2 },
  { k: '8', cls: 'num', col: 2, row: 2 },
  { k: '9', cls: 'num', col: 3, row: 2 },
  { k: '−', cls: 'op', col: 4, row: 2, aria: 'Kurang' },
  { k: '4', cls: 'num', col: 1, row: 3 },
  { k: '5', cls: 'num', col: 2, row: 3 },
  { k: '6', cls: 'num', col: 3, row: 3 },
  { k: '+', cls: 'op', col: 4, row: 3, aria: 'Tambah' },
  { k: '1', cls: 'num', col: 1, row: 4 },
  { k: '2', cls: 'num', col: 2, row: 4 },
  { k: '3', cls: 'num', col: 3, row: 4 },
  { k: '=', cls: 'eq', col: 4, row: 4 },
  { k: '00', cls: 'num', col: 1, row: 5 },
  { k: '0', cls: 'num', col: 2, row: 5 },
  { k: '000', cls: 'num', col: 3, row: 5 },
];
const CLS = {
  num: 'bg-[var(--kb-key)] text-[23px]',
  fn: 'bg-[var(--kb-fn)] text-body font-semibold',
  op: 'bg-[var(--kb-fn)] text-[24px]',
  eq: 'bg-primary text-body font-semibold text-primary-foreground',
} as const;
</script>

<template>
  <div class="grid grid-cols-4 grid-rows-[repeat(5,48px)] gap-1.5 px-[5px] pb-[30px] pt-[7px]">
    <button
      v-for="key in KEYS"
      :key="key.k"
      type="button"
      :aria-label="key.k === '=' ? (props.hasOperator ? 'Hitung' : 'Lanjut') : key.aria"
      :style="{ gridColumn: key.col, gridRow: key.k === '=' ? '4 / span 2' : key.row }"
      :class="[
        'kb-key grid place-items-center rounded-[7px] shadow-[0_1px_0_var(--kb-shadow)] active:scale-[0.96]',
        CLS[key.cls],
        key.cls !== 'eq' && 'active:bg-[var(--kb-key-press)]',
      ]"
      @click="emit('press', key.k)"
    >
      <Delete v-if="key.k === 'del'" class="size-6" stroke-width="1.8" aria-hidden="true" />
      <template v-else-if="key.k === '='">{{ props.hasOperator ? '=' : 'Lanjut' }}</template>
      <template v-else>{{ key.k }}</template>
    </button>
  </div>
</template>

<style scoped>
.kb-key {
  -webkit-touch-callout: none;
  user-select: none;
  transition:
    transform 80ms ease-out,
    background-color 80ms ease;
}
</style>
