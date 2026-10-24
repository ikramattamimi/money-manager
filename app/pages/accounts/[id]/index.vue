<script setup lang="ts">
import { ArrowLeft, Inbox, Pencil, Scale } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import PageHero from '@/components/layout/PageHero.vue';
import StatChip from '@/components/layout/StatChip.vue';
import AccountForm from '@/components/money/AccountForm.vue';
import AdjustBalanceForm from '@/components/money/AdjustBalanceForm.vue';
import TransactionRow from '@/components/money/TransactionRow.vue';
import { useAccountLedger, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { transactionsApi, type Transaction } from '@/features/transactions/api';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { dayKey, dayLabel } from '@/lib/time';

definePageMeta({ layout: 'app' });

const route = useRoute();
const id = computed(() => String(route.params.id));
const { canEdit } = useActiveBook();
const { byId, groupById } = useAccounts();
const { rowProps } = useTxDisplay();
const editor = useTxEditor();
const toast = useToast();

const account = computed(() => byId.value.get(id.value) ?? null);
const group = computed(() =>
  account.value ? groupById.value.get(account.value.group_id) : undefined,
);
useHead({ title: () => `${account.value?.name ?? 'Akun'} · Money Manager` });

const { data: ledger, isPending } = useAccountLedger(id);

// Kelompok per hari; tiap baris membawa saldo setelah transaksi itu
const days = computed(() => {
  const groups = new Map<string, NonNullable<typeof ledger.value>>();
  for (const row of ledger.value ?? []) {
    const key = dayKey(row.occurred_at);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
});

type LedgerRow = NonNullable<typeof ledger.value>[number];
function asTx(row: LedgerRow): Transaction {
  return {
    ...row,
    book_id: account.value?.book_id ?? '',
    description: '',
    source: 'manual',
    created_at: row.occurred_at,
    updated_at: row.occurred_at,
    created_by: null,
    dedupe_key: null,
    import_batch_id: null,
    recurring_rule_id: null,
  } as Transaction;
}

async function openTx(row: LedgerRow) {
  try {
    editor.edit(await transactionsApi.get(row.id));
  } catch (e) {
    toast.show((e as Error).message);
  }
}

const formOpen = ref(false);
const adjustOpen = ref(false);
const session = ref(0);
const { openAsPage } = useFormPage();
function open(which: 'form' | 'adjust') {
  if (openAsPage(`/accounts/${id.value}/${which === 'form' ? 'edit' : 'adjust'}`)) return;
  session.value++;
  if (which === 'form') formOpen.value = true;
  else adjustOpen.value = true;
}
</script>

<template>
  <div>
    <PageHeader
      :title="account?.name ?? 'Akun'"
      :summary="account ? formatRupiah(account.balance) : ''"
    >
      <template #actions>
        <HeaderButton label="Kembali ke daftar akun" @click="navigateTo('/accounts')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <template v-if="canEdit && account">
          <HeaderButton @click="open('adjust')"><Scale aria-hidden="true" />Sesuaikan</HeaderButton>
          <HeaderButton label="Ubah akun" @click="open('form')"
            ><Pencil aria-hidden="true"
          /></HeaderButton>
        </template>
      </template>
      <PageHero v-if="account" label="Saldo sekarang" :value="formatRupiah(account.balance)" />
      <div v-if="account" class="flex flex-wrap gap-1.5">
        <StatChip label="Grup" :value="group?.name ?? '-'" />
        <StatChip
          v-if="!account.include_in_total"
          label="Total aset"
          value="tidak ikut"
          tone="warn"
        />
        <StatChip v-if="account.archived" label="Status" value="diarsipkan" tone="warn" />
      </div>
    </PageHeader>

    <Card v-if="isPending" class="mt-3.5 p-1"><Skeleton :rows="5" /></Card>
    <Card v-else-if="!days.length" class="mt-3.5">
      <EmptyState
        :icon="Inbox"
        title="Belum ada transaksi"
        description="Transaksi yang memakai akun ini akan tampil di sini."
      />
    </Card>
    <ListGroup v-for="d in days" :key="d.key" :label="dayLabel(d.items[0]!.occurred_at)">
      <TransactionRow
        v-for="row in d.items"
        :key="row.id"
        v-bind="rowProps(asTx(row), id)"
        :meta="`Saldo ${formatRupiah(row.balance_after)}`"
        @select="openTx(row)"
      />
    </ListGroup>
    <p v-if="(ledger?.length ?? 0) >= 200" class="mt-3 text-center text-xs text-faint">
      Menampilkan 200 transaksi terakhir.
    </p>

    <Overlay v-model:open="formOpen" labelledby="account-form-title">
      <AccountForm
        v-if="account"
        :key="session"
        :account="account"
        title-id="account-form-title"
        @close="formOpen = false"
      />
    </Overlay>
    <Overlay v-model:open="adjustOpen" labelledby="adjust-title">
      <AdjustBalanceForm
        v-if="account"
        :key="session"
        :account="account"
        title-id="adjust-title"
        @close="adjustOpen = false"
      />
    </Overlay>
  </div>
</template>
