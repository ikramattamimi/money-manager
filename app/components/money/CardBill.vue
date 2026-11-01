<script setup lang="ts">
import { CalendarClock } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import IosButton from '@/components/ios/IosButton.vue';
import type { Account } from '@/features/accounts/api';
import type { CardBill } from '@/features/accounts/billing';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { MONTHS_LONG, MONTHS_SHORT } from '@/lib/time';

// Kartu kredit di rincian akun (mockup card-detail): baris Periode tagihan,
// Tanggal bayar, Rekening pembayar, lalu tombol Bayar tagihan yang membuka
// form transfer terisi (dari rekening pembayar terakhir ke kartu ini).
// Tagihan dihitung di halaman (billing.ts) karena dipakai juga di strip atas.
const props = defineProps<{
  account: Account;
  /** null = tanggal cetak/jatuh tempo belum diatur */
  bill: CardBill | null;
  /** Rekening asal pembayaran terakhir */
  payerId: string | null;
}>();
const emit = defineEmits<{ settings: [] }>();

const { canEdit } = useActiveBook();
const { name } = useAccounts();
const editor = useTxEditor();

const short = (key: string) =>
  `${Number(key.slice(8))} ${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]}`;
const STATUS = {
  paid: { label: 'Lunas', tone: 'inc' },
  open: { label: 'Belum lunas', tone: undefined },
  overdue: { label: 'Lewat jatuh tempo', tone: 'exp' },
  none: { label: 'Tidak ada tagihan', tone: undefined },
} as const;

function pay() {
  const b = props.bill;
  if (!b) return;
  editor.create({
    type: 'transfer',
    amount: b.remaining,
    accountId: props.payerId,
    toAccountId: props.account.id,
    categoryId: null,
    note: `Bayar tagihan ${props.account.name} ${MONTHS_LONG[b.last.month - 1]}`,
    occurredAt: null,
  });
}
</script>

<template>
  <div v-if="!bill" class="mx-4 mt-3 overflow-hidden rounded-group bg-card">
    <GroupRow
      title="Atur tanggal tagihan"
      subtitle="Tanggal cetak dan jatuh tempo, supaya tagihan per periode bisa dihitung"
      :chevron="canEdit"
      v-on="canEdit ? { click: () => emit('settings') } : {}"
    >
      <template #icon><ToneIcon :icon="CalendarClock" tone="orange" size="sm" solid /></template>
    </GroupRow>
  </div>

  <template v-else>
    <div class="mx-4 mt-3 overflow-hidden rounded-group bg-card">
      <GroupRow
        title="Periode tagihan"
        :value="`${short(bill.current.start)} – ${short(bill.current.end)}`"
      />
      <GroupRow
        title="Tanggal bayar"
        :subtitle="`Tagihan ${MONTHS_LONG[bill.last.month - 1]} · ${STATUS[bill.status].label}`"
        :value="short(bill.last.due)"
        :value-tone="STATUS[bill.status].tone"
      />
      <GroupRow
        title="Rekening pembayar"
        :value="payerId ? name(payerId) || 'Akun lain' : 'Dipilih saat bayar'"
      />
      <GroupRow
        v-if="bill.owed"
        title="Dicetak"
        :subtitle="`Sudah dibayar ${formatRupiah(bill.paid)}`"
        :value="formatRupiah(bill.owed)"
      />
    </div>
    <div v-if="canEdit && bill.remaining > 0" class="px-4 pt-3">
      <IosButton block @click="pay">Bayar tagihan {{ formatRupiah(bill.remaining) }}</IosButton>
    </div>
  </template>
</template>
