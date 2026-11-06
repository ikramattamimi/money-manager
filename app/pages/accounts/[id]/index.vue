<script setup lang="ts">
import { Pencil } from '@lucide/vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import MonthNav from '@/components/ios/MonthNav.vue';
import MonthPickerSheet from '@/components/ios/MonthPickerSheet.vue';
import MonthSwipe from '@/components/ios/MonthSwipe.vue';
import NavBar from '@/components/ios/NavBar.vue';
import SubTabs from '@/components/ios/SubTabs.vue';
import SummaryStrip from '@/components/ios/SummaryStrip.vue';
import AccountForm from '@/components/money/AccountForm.vue';
import CardBill from '@/components/money/CardBill.vue';
import DayGroup from '@/components/money/DayGroup.vue';
import TxRow from '@/components/money/TxRow.vue';
import { accountBill, lastPayer } from '@/features/accounts/billing';
import {
  deltaFor,
  fromLedger,
  monthPlan,
  newestFirst,
  runningBalances,
  type MonthBalance,
} from '@/features/accounts/months';
import { TREND_MONTHS, useAccountMonths } from '@/features/accounts/useAccountMonth';
import { useAccountLedger, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { Transaction } from '@/features/transactions/api';
import { groupByDay } from '@/features/transactions/grouping';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { useMonthTransactions } from '@/features/transactions/useTransactions';
import { formatRupiah } from '@/lib/format';
import { dayKey, jakartaParts, MONTHS_LONG, MONTHS_SHORT, periodRangeLabel } from '@/lib/time';

// Rincian akun (mockup account-detail / card-detail): ‹ Akun, nama, pensil =
// ubah akun; bulan sama dengan tab Transaksi (useSelectedMonth); sub-tab
// Harian / Bulanan; strip Setoran / Penarikan / Saldo (kartu kredit: Tagihan /
// Belum ditagih / Saldo). Harian = transaksi bulan itu dengan saldo berjalan
// di bawah nominal; kepala tanggal = catat dengan akun ini. Bulanan = 6 bulan
// dengan saldo akhir. Geser isi = pindah bulan.
definePageMeta({ layout: 'app' });

const route = useRoute();
const id = computed(() => String(route.params.id));
const { canEdit, monthStartDay } = useActiveBook();
const { md } = useBreakpoint();
const { accounts, byId, groupById } = useAccounts();
const { rowView } = useTxDisplay();
const editor = useTxEditor();

const account = computed(() => byId.value.get(id.value) ?? null);
const group = computed(() =>
  account.value ? groupById.value.get(account.value.group_id) : undefined,
);
const isCard = computed(() => group.value?.kind === 'card');
useHead({ title: () => `${account.value?.name ?? 'Akun'} · Money Manager` });

// ---------- bulan (bersama tab Transaksi) ----------
const selected = useSelectedMonth();
const { year, month } = selected;
const swipeKey = computed(() => `${year.value}-${String(month.value).padStart(2, '0')}`);
const pickerOpen = ref(false);

const TABS = [
  { value: 'daily', label: 'Harian' },
  { value: 'monthly', label: 'Bulanan' },
] as const;
const tab = ref<(typeof TABS)[number]['value']>('daily');

// ---------- transaksi bulan ini untuk akun ini ----------
const monthTx = useMonthTransactions(year, month);
const rows = computed<Transaction[]>(() =>
  newestFirst(
    (monthTx.data.value ?? []).filter(
      (t) => t.account_id === id.value || t.to_account_id === id.value,
    ),
  ),
);

// ---------- saldo per bulan: RPC, atau riwayat akun kalau RPC belum ada ----------
const monthly = useAccountMonths(year, month);
const ledgerLimit = computed(() => (monthly.available.value ? 200 : 1000));
const ledger = useAccountLedger(
  id,
  ledgerLimit,
  computed(() => isCard.value || !monthly.available.value),
);
const months = computed<(MonthBalance | null)[]>(() => {
  const fromRpc = monthly.byAccount.value?.get(id.value);
  if (fromRpc) return fromRpc;
  const list = ledger.data.value;
  if (monthly.available.value || !list || !account.value) return [];
  const plan = monthPlan(year.value, month.value, TREND_MONTHS, monthStartDay.value);
  return fromLedger(list, account.value.opening_balance, list.length < ledgerLimit.value, plan);
});
/** Bulan terpilih (null kalau belum termuat, masih bulan lama, atau tidak diketahui) */
const current = computed(() => {
  const last = months.value.at(-1);
  return last && last.year === year.value && last.month === month.value ? last : null;
});
const endBalance = computed(() =>
  current.value
    ? current.value.end
    : selected.isCurrent.value && account.value
      ? account.value.balance
      : null,
);
const running = computed(() =>
  endBalance.value === null ? null : runningBalances(rows.value, id.value, endBalance.value),
);

// Setoran/penarikan dari daftar bulan ini (sudah termuat bersama tab Transaksi)
const flow = computed(() => {
  let inflow = 0;
  let outflow = 0;
  for (const t of rows.value) {
    const d = deltaFor(t, id.value);
    if (d > 0) inflow += d;
    else outflow -= d;
  }
  return { inflow, outflow };
});

const days = computed(() =>
  groupByDay(rows.value).map((d) => {
    let income = 0;
    let expense = 0;
    for (const t of d.items) {
      const delta = deltaFor(t, id.value);
      if (delta > 0) income += delta;
      else expense -= delta;
    }
    return { ...d, income, expense };
  }),
);

// ---------- kartu kredit ----------
const todayKey = dayKey(new Date());
const bill = computed(() =>
  account.value && isCard.value
    ? accountBill(account.value, ledger.data.value ?? [], todayKey)
    : null,
);
const payerId = computed(() => lastPayer(ledger.data.value ?? [], id.value));

const strip = computed(() => {
  const end = endBalance.value === null ? '—' : formatRupiah(endBalance.value);
  if (isCard.value) {
    const b = bill.value;
    return [
      {
        label: b
          ? `Tagihan ${Number(b.last.due.slice(8))} ${MONTHS_SHORT[Number(b.last.due.slice(5, 7)) - 1]}`
          : 'Tagihan',
        value: b ? formatRupiah(b.remaining) : '—',
        tone: 'exp' as const,
      },
      { label: 'Belum ditagih', value: b ? formatRupiah(b.currentCharges) : '—' },
      { label: 'Saldo', value: end },
    ];
  }
  return [
    { label: 'Setoran', value: formatRupiah(flow.value.inflow), tone: 'inc' as const },
    { label: 'Penarikan', value: formatRupiah(flow.value.outflow), tone: 'exp' as const },
    { label: 'Saldo', value: end },
  ];
});

// ---------- catat di tanggal tertentu dengan akun ini ----------
function addOn(key: string) {
  if (!canEdit.value || !account.value) return;
  // Jam sekarang di tanggal itu, supaya urutan dalam hari tetap wajar
  const now = jakartaParts(new Date());
  const pad = (n: number) => String(n).padStart(2, '0');
  const occurredAt =
    key === todayKey
      ? null
      : new Date(`${key}T${pad(now.hour)}:${pad(now.minute)}:00+07:00`).toISOString();
  editor.create({
    type: 'expense',
    amount: 0,
    accountId: id.value,
    toAccountId: null,
    categoryId: null,
    note: '',
    occurredAt,
  });
}

/** Bulanan: ketuk bulan = Harian bulan itu */
function openMonth(m: MonthBalance) {
  selected.set(m.year, m.month);
  tab.value = 'daily';
}
const monthRows = computed(() =>
  monthPlan(year.value, month.value, TREND_MONTHS, monthStartDay.value)
    .months.map((m, k) => ({ ...m, data: months.value[k] ?? null }))
    .reverse(),
);

// ---------- form ----------
// Sesuaikan saldo lewat form ubah akun (isian saldo), tidak ada baris terpisah
const formOpen = ref(false);
const session = ref(0);
const { openAsPage } = useFormPage();
function openForm() {
  if (openAsPage(`/accounts/${id.value}/edit`)) return;
  session.value++;
  formOpen.value = true;
}
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-0 md:mt-0 md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      :title="account?.name ?? 'Akun'"
      back="Akun"
      back-to="/accounts"
      class="sticky top-0 md:static"
    >
      <template #right>
        <IconButton v-if="canEdit && account" label="Ubah akun" accent @click="openForm()">
          <Pencil class="!size-5" aria-hidden="true" />
        </IconButton>
      </template>
      <div class="flex justify-center pb-1">
        <MonthNav
          :label="selected.label.value"
          :long-label="selected.longLabel.value"
          :hint="selected.rangeHint.value"
          :can-next="selected.canNext.value"
          @prev="selected.shift(-1)"
          @next="selected.shift(1)"
          @pick="pickerOpen = true"
        />
      </div>
      <SubTabs v-model="tab" :options="TABS" label="Tampilan rincian akun" />
    </NavBar>

    <SummaryStrip :items="strip" dense />

    <EmptyCard v-if="accounts.isPending.value" title="Memuat akun…" />
    <EmptyCard
      v-else-if="!account"
      title="Akun tidak ditemukan"
      description="Mungkin sudah dihapus atau ada di buku lain."
    >
      <IosButton variant="soft" to="/accounts">Ke daftar akun</IosButton>
    </EmptyCard>

    <MonthSwipe
      v-else
      :month-key="swipeKey"
      :prev-label="selected.neighborLabel(-1)"
      :next-label="selected.neighborLabel(1)"
      :can-next="selected.canNext.value"
      :disabled="md"
      class="min-h-[60dvh] pb-6"
      @shift="selected.shift"
    >
      <p v-if="account.archived" class="mx-8 mb-0 mt-3 text-meta text-muted-foreground">
        Akun ini diarsipkan. Transaksinya tetap tersimpan; pulihkan lewat Ubah akun.
      </p>

      <CardBill
        v-if="isCard && !ledger.isPending.value"
        :account="account"
        :bill="bill"
        :payer-id="payerId"
        @settings="openForm()"
      />

      <!-- Harian -->
      <template v-if="tab === 'daily'">
        <EmptyCard
          v-if="monthTx.isPending.value && !monthTx.data.value"
          title="Memuat transaksi…"
        />
        <EmptyCard
          v-else-if="!rows.length"
          title="Tidak ada transaksi"
          :description="`${account.name} tidak dipakai di ${MONTHS_LONG[month - 1]} ${year}. Geser untuk bulan lain.`"
        />
        <DayGroup
          v-for="d in days"
          :key="d.key"
          :day-key="d.key"
          :income="d.income"
          :expense="d.expense"
          :addable="canEdit"
          @add="addOn(d.key)"
        >
          <TxRow
            v-for="t in d.items"
            :id="t.id"
            :key="t.id"
            v-bind="rowView(t, id)"
            :balance="running?.has(t.id) ? formatRupiah(running.get(t.id)!) : undefined"
            :selectable="false"
            @open="editor.edit(t)"
          />
        </DayGroup>
      </template>

      <!-- Bulanan: 6 bulan sampai bulan terpilih, saldo akhir tiap bulan -->
      <div v-else class="mt-2.5">
        <button
          v-for="m in monthRows"
          :key="`${m.year}-${m.month}`"
          type="button"
          :aria-current="m.year === year && m.month === month ? 'true' : undefined"
          :class="[
            'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-[11px] text-left shadow-[inset_0_-0.5px_0_var(--sep)] active:bg-fill-press',
            m.year === year && m.month === month ? 'bg-primary-soft' : 'bg-card',
          ]"
          @click="m.data && openMonth(m.data)"
        >
          <span class="text-body font-semibold">
            {{ MONTHS_LONG[m.month - 1] }} {{ m.year }}
            <small class="mt-px block text-[12.5px] font-medium text-muted-foreground">
              {{
                m.data
                  ? `Saldo akhir ${formatRupiah(m.data.end)}`
                  : periodRangeLabel(m.year, m.month, monthStartDay) || 'Saldo belum bisa dihitung'
              }}
            </small>
          </span>
          <span v-if="m.data" class="flex flex-col items-end gap-px text-[13.5px] font-semibold">
            <span class="text-inc">{{ formatRupiah(m.data.inflow) }}</span>
            <span class="text-exp">{{ formatRupiah(m.data.outflow) }}</span>
          </span>
        </button>
        <p v-if="!monthly.available.value" class="mx-8 mb-0 mt-3 text-meta text-muted-foreground">
          Saldo per bulan dihitung dari riwayat akun terbaru. Bulan yang lebih lama tampil setelah
          pembaruan database.
        </p>
      </div>
    </MonthSwipe>

    <MonthPickerSheet
      v-model:open="pickerOpen"
      :year="year"
      :month="month"
      :current="selected.current.value"
      :max-index="selected.maxIndex.value"
      @pick="selected.set"
    />

    <Overlay v-model:open="formOpen" labelledby="account-form-title">
      <AccountForm
        v-if="account"
        :key="session"
        :account="account"
        title-id="account-form-title"
        @close="formOpen = false"
      />
    </Overlay>
  </div>
</template>
