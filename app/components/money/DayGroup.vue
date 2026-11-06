<script setup lang="ts">
import { dayParts } from '@/features/transactions/grouping';
import { formatRupiah } from '@/lib/format';
import { MONTHS_LONG } from '@/lib/time';

// Satu hari di daftar Harian (mockup .dg/.dh): tanggal besar, hari berwarna
// (Sabtu biru, Minggu merah), bulan.tahun, lalu masuk dan keluar hari itu.
// Kepala bisa diketuk untuk mencatat di tanggal itu (`addable`).
const props = withDefaults(
  defineProps<{ dayKey: string; income: number; expense: number; addable?: boolean }>(),
  { addable: false },
);
const emit = defineEmits<{ add: [] }>();

const parts = computed(() => dayParts(props.dayKey));
const longLabel = computed(
  () =>
    `${parts.value.weekday}, ${parts.value.num} ${MONTHS_LONG[Number(props.dayKey.slice(5, 7)) - 1]} ${props.dayKey.slice(0, 4)}`,
);
const WD = { sat: 'bg-primary-accent', sun: 'bg-exp' } as const;
</script>

<template>
  <section :id="`day-${dayKey}`" class="mt-2.5 scroll-mt-40 bg-card" :aria-label="longLabel">
    <component
      :is="addable ? 'button' : 'div'"
      :type="addable ? 'button' : undefined"
      :aria-label="addable ? `Catat transaksi di ${longLabel}` : undefined"
      :class="[
        'flex w-full items-center gap-2 px-4 pb-2 pt-[9px] text-left shadow-[inset_0_-0.5px_0_var(--sep)]',
        addable && 'transition-[background-color] duration-[120ms] active:bg-fill-press',
      ]"
      @click="addable && emit('add')"
    >
      <span class="min-w-7 text-[22px] font-bold tracking-[-0.03em]">{{ parts.num }}</span>
      <span
        :class="[
          'rounded-[5px] px-[5px] py-0.5 text-[11px] font-bold text-white',
          parts.tone ? WD[parts.tone] : 'bg-[var(--tone-gray)]',
        ]"
        >{{ parts.weekday }}</span
      >
      <span class="flex-1 text-[12.5px] text-muted-foreground">{{ parts.monthYear }}</span>
      <span class="min-w-[84px] text-right text-amount font-semibold text-inc">{{
        income ? formatRupiah(income) : ''
      }}</span>
      <span class="min-w-[84px] text-right text-amount font-semibold text-exp">{{
        expense ? formatRupiah(expense) : ''
      }}</span>
    </component>
    <slot />
  </section>
</template>
