<script setup lang="ts">
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import type { Transaction } from '@/features/transactions/api';
import { dayParts, shortDate, type Sums } from '@/features/transactions/grouping';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { formatRupiah } from '@/lib/format';
import { MONTHS_LONG } from '@/lib/time';
import TxRow from './TxRow.vue';

// Lembar satu hari dari Kalender (mockup shDay): judul tanggal, masuk/keluar,
// daftar transaksi, tombol "Catat di 30 Okt". Bisa ditarik turun.
const open = defineModel<boolean>('open', { required: true });
const props = defineProps<{
  dayKey: string;
  items: Transaction[];
  sums: Sums;
  canAdd: boolean;
}>();
const emit = defineEmits<{ add: []; open: [tx: Transaction] }>();
const { rowView } = useTxDisplay();

const title = computed(() => {
  const p = dayParts(props.dayKey);
  return `${p.weekday}, ${p.num} ${MONTHS_LONG[Number(props.dayKey.slice(5, 7)) - 1]}`;
});
</script>

<template>
  <IosSheet v-model:open="open" :title="title">
    <template #header>
      <span v-if="sums.income" class="text-[14px] font-semibold text-inc">{{
        formatRupiah(sums.income)
      }}</span>
      <span v-if="sums.expense" class="text-[14px] font-semibold text-exp">{{
        formatRupiah(sums.expense)
      }}</span>
    </template>
    <p v-if="!items.length" class="mb-3.5 mt-0.5 text-body text-muted-foreground">
      Belum ada transaksi di tanggal ini.
    </p>
    <div v-else class="mb-3.5 overflow-hidden rounded-[14px] bg-background">
      <TxRow
        v-for="t in items"
        :id="t.id"
        :key="t.id"
        v-bind="rowView(t)"
        :selectable="false"
        @open="emit('open', t)"
      />
    </div>
    <template v-if="canAdd" #footer>
      <IosButton block @click="emit('add')">Catat di {{ shortDate(dayKey) }}</IosButton>
    </template>
  </IosSheet>
</template>
