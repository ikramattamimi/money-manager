<script setup lang="ts">
import { CalendarClock, CreditCard, Settings2 } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { TONE_TEXT, type Tone } from '@/components/data/tone';
import { Button } from '@/components/ui/button';
import type { Account, LedgerRow } from '@/features/accounts/api';
import { cardBill } from '@/features/accounts/billing';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { dayKey, MONTHS_LONG, MONTHS_SHORT } from '@/lib/time';

// Tagihan kartu kredit di detail akun (fase 11 T3): tagihan terakhir yang
// dicetak, pembayarannya, dan belanja periode berjalan. Bayar tagihan =
// transfer dari akun lain ke kartu ini.
const props = defineProps<{ account: Account; ledger: LedgerRow[] }>();
const emit = defineEmits<{ settings: [] }>();

const { canEdit } = useActiveBook();
const editor = useTxEditor();

const configured = computed(() => !!props.account.statement_day && !!props.account.due_day);
const bill = computed(() =>
  configured.value
    ? cardBill(
        props.ledger,
        props.account.balance,
        dayKey(new Date()),
        props.account.statement_day!,
        props.account.due_day!,
      )
    : null,
);

const short = (key: string) =>
  `${Number(key.slice(8))} ${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]}`;
const STATUS: Record<string, { label: string; tone: Tone }> = {
  paid: { label: 'Lunas', tone: 'ok' },
  open: { label: 'Belum lunas', tone: 'warn' },
  overdue: { label: 'Lewat jatuh tempo', tone: 'bad' },
  none: { label: 'Tidak ada tagihan', tone: 'neutral' },
};

function pay() {
  const b = bill.value;
  if (!b) return;
  editor.create({
    type: 'transfer',
    amount: b.remaining,
    accountId: null,
    toAccountId: props.account.id,
    categoryId: null,
    note: `Bayar tagihan ${props.account.name} ${MONTHS_LONG[b.last.month - 1]}`,
    occurredAt: null,
  });
}
</script>

<template>
  <Card class="mt-3.5">
    <CardHead title="Tagihan kartu kredit" />
    <div v-if="!configured" class="flex items-start gap-3 px-3.5 pb-3.5">
      <ToneIcon :icon="Settings2" tone="primary" size="sm" />
      <div class="flex flex-1 flex-col gap-2">
        <p class="m-0 text-meta text-muted-foreground">
          Atur tanggal cetak tagihan dan jatuh tempo supaya tagihan per periode bisa dihitung.
        </p>
        <Button v-if="canEdit" variant="secondary" class="self-start" @click="emit('settings')">
          Atur tanggal
        </Button>
      </div>
    </div>

    <div v-else-if="bill" class="flex flex-col gap-3 px-3.5 pb-3.5">
      <div class="flex items-start gap-3">
        <ToneIcon :icon="CreditCard" :tone="STATUS[bill.status]!.tone" size="sm" />
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="text-xs text-muted-foreground">
            Tagihan {{ MONTHS_LONG[bill.last.month - 1] }} · {{ short(bill.last.start) }} –
            {{ short(bill.last.end) }}
          </span>
          <b class="text-[22px] font-bold tabular-nums">{{ formatRupiah(bill.remaining) }}</b>
          <span :class="['text-xs font-semibold', TONE_TEXT[STATUS[bill.status]!.tone]]">
            {{ STATUS[bill.status]!.label }}
            <template v-if="bill.owed">
              · dicetak {{ formatRupiah(bill.owed) }}, dibayar
              {{ formatRupiah(bill.paid) }}</template
            >
          </span>
        </div>
      </div>
      <p class="m-0 flex items-center gap-1.5 text-meta">
        <CalendarClock class="size-4 text-muted-foreground" aria-hidden="true" />
        Jatuh tempo <b>{{ short(bill.last.due) }}</b>
      </p>
      <p class="m-0 text-meta text-muted-foreground">
        Periode berjalan {{ short(bill.current.start) }} – {{ short(bill.current.end) }}: belanja
        <b class="text-foreground tabular-nums">{{ formatRupiah(bill.currentCharges) }}</b
        >, masuk tagihan {{ MONTHS_LONG[bill.current.month - 1] }} (jatuh tempo
        {{ short(bill.current.due) }}).
      </p>
      <Button v-if="canEdit && bill.remaining > 0" size="touch" @click="pay">
        Bayar tagihan {{ formatRupiah(bill.remaining) }}
      </Button>
    </div>
  </Card>
</template>
