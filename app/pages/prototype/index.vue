<script setup lang="ts">
import { CalendarX, Search } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import HBarList from '@/components/charts/HBarList.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import MonthPicker from '@/components/layout/MonthPicker.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import PageHero from '@/components/layout/PageHero.vue';
import StatChip from '@/components/layout/StatChip.vue';
import QuickAddPanel from '@/components/money/QuickAddPanel.vue';
import TransactionRow from '@/components/money/TransactionRow.vue';
import type { Tone } from '@/components/data/tone';
import { useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import { formatRupiah, formatShort } from '@/lib/format';
import { HISTORY, TODAY, type MockTx } from '@/mocks/data';
import { useMockLedger } from '@/mocks/useMockLedger';

definePageMeta({ layout: 'prototype' });

const ledger = useMockLedger();
const toast = useToast();
const { lg } = useBreakpoint();
const ui = useQuickAddUi();
const firstOpen = useState('proto:first', () => true);
const stagger = ref(firstOpen.value);
onMounted(() => (firstOpen.value = false));

const VIEWS = [
  { value: 'daily', label: 'Harian' },
  { value: 'calendar', label: 'Kalender' },
  { value: 'monthly', label: 'Bulanan' },
] as const;
const view = ref<(typeof VIEWS)[number]['value']>('daily');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const month = ref(9);

function changeMonth(step: number) {
  month.value = Math.min(9, Math.max(0, month.value + step));
  if (month.value !== 9) toast.show('Prototipe: data hanya ada untuk Oktober');
}

const net = computed(() => ledger.totals.value.income - ledger.totals.value.expense);
const used = computed(() =>
  ledger.totals.value.income ? ledger.totals.value.expense / ledger.totals.value.income : 0,
);

// ---------- baris transaksi ----------
const SIGN = { income: '+', expense: '−', transfer: '' } as const;
function rowProps(t: MockTx) {
  const c = ledger.category(t.categoryId);
  return {
    icon: c.icon,
    tone: c.tone as Tone,
    title: t.note,
    subtitle:
      t.type === 'transfer'
        ? `${ledger.accountName(t.accountId)} → ${ledger.accountName(t.toAccountId)}`
        : `${c.name} · ${ledger.accountName(t.accountId)}`,
    amount: SIGN[t.type] + formatRupiah(t.amount),
    kind: t.type,
    meta: t.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

function dayLabel(date: Date) {
  const d = date.getDate();
  if (d === TODAY.getDate()) return 'Hari ini';
  if (d === TODAY.getDate() - 1) return 'Kemarin';
  return `${DAYS[date.getDay()]}, ${d} Okt`;
}
const dayNet = (list: MockTx[]) =>
  list.reduce(
    (s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0),
    0,
  );
const signed = (n: number) => (n ? (n > 0 ? '+' : '−') + formatRupiah(Math.abs(n)) : '');

const days = computed(() => {
  const by = new Map<number, MockTx[]>();
  for (const t of [...ledger.txs.value].sort((a, b) => +b.date - +a.date)) {
    const key = t.date.getDate();
    by.set(key, [...(by.get(key) ?? []), t]);
  }
  return [...by.values()];
});

function remove(id: string) {
  const result = ledger.remove(id);
  if (result) toast.show(`${result.note} dihapus`, result.undo);
}

// Sorot transaksi baru / dipulihkan
const rows = ref<Record<string, InstanceType<typeof TransactionRow> | null>>({});
watch(ledger.highlight, (id) => {
  if (!id) return;
  nextTick(() => {
    rows.value[id]?.flash();
    ledger.highlight.value = null;
  });
});

// ---------- kalender ----------
const selectedDay = ref(TODAY.getDate());
const offset = (new Date(2026, 9, 1).getDay() + 6) % 7; // minggu mulai Senin
const daySums = computed(() => {
  const sums: Record<number, { income: number; expense: number }> = {};
  for (const t of ledger.txs.value) {
    const s = (sums[t.date.getDate()] ??= { income: 0, expense: 0 });
    if (t.type === 'income') s.income += t.amount;
    if (t.type === 'expense') s.expense += t.amount;
  }
  return sums;
});
const selectedList = computed(() =>
  ledger.txs.value
    .filter((t) => t.date.getDate() === selectedDay.value)
    .sort((a, b) => +b.date - +a.date),
);

// ---------- bulanan ----------
const months = computed(() =>
  [
    ...HISTORY.map(([m, i, o]) => ({
      key: m,
      name: MONTHS_LONG[MONTHS.indexOf(m)]!,
      income: i * 1e6,
      expense: o * 1e6,
    })),
    {
      key: 'Okt',
      name: 'Oktober (berjalan)',
      income: ledger.totals.value.income,
      expense: ledger.totals.value.expense,
    },
  ].reverse(),
);

// ---------- kolom kanan ----------
const topCats = computed(() => {
  const by: Record<string, number> = {};
  for (const t of ledger.txs.value)
    if (t.type === 'expense') by[t.categoryId] = (by[t.categoryId] ?? 0) + t.amount;
  return Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, value]) => {
      const c = ledger.category(id);
      return {
        id,
        label: c.name,
        value,
        display: formatShort(value),
        icon: c.icon,
        tone: c.tone as Tone,
      };
    });
});

const inlinePanel = ref<InstanceType<typeof QuickAddPanel>>();
watch(ui.focusTick, () => nextTick(() => inlinePanel.value?.focus()));
</script>

<template>
  <div>
    <PageHeader title="Transaksi" :summary="`Sisa ${formatShort(net)}`">
      <template #actions>
        <MonthPicker
          :label="`${MONTHS[month]} 2026`"
          :can-next="month < 9"
          @prev="changeMonth(-1)"
          @next="changeMonth(1)"
        />
        <HeaderButton label="Cari"><Search aria-hidden="true" /></HeaderButton>
      </template>
      <PageHero
        :label="`Sisa ${MONTHS_LONG[month]}`"
        :value="formatRupiah(net)"
        :progress="{ label: 'Terpakai dari pemasukan', value: used }"
      />
      <div class="flex flex-wrap gap-1.5">
        <StatChip label="Masuk" :value="formatShort(ledger.totals.value.income)" tone="ok" />
        <StatChip label="Keluar" :value="formatShort(ledger.totals.value.expense)" tone="bad" />
        <StatChip label="Transaksi" :value="ledger.txs.value.length" />
      </div>
      <SegmentedControl v-model="view" :options="VIEWS" label="Tampilan" variant="on-grad" />
    </PageHeader>

    <div
      class="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-5"
    >
      <div :class="stagger && 'stagger'">
        <!-- Harian -->
        <template v-if="view === 'daily'">
          <ListGroup
            v-for="list in days"
            :key="list[0]!.date.getDate()"
            :label="dayLabel(list[0]!.date)"
            :aside="signed(dayNet(list))"
            :aside-class="dayNet(list) > 0 ? 'text-primary-accent' : 'text-bad'"
          >
            <TransactionRow
              v-for="t in list"
              :key="t.id"
              :ref="(el) => (rows[t.id] = el as InstanceType<typeof TransactionRow> | null)"
              v-bind="rowProps(t)"
              deletable
              @delete="remove(t.id)"
            />
          </ListGroup>
        </template>

        <!-- Kalender -->
        <template v-else-if="view === 'calendar'">
          <Card class="mt-3.5 px-2 py-2.5">
            <div class="grid grid-cols-7">
              <span
                v-for="d in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']"
                :key="d"
                class="pb-1.5 pt-0.5 text-center text-2xs font-semibold uppercase tracking-wide text-faint"
                >{{ d }}</span
              >
            </div>
            <div class="grid grid-cols-7 gap-0.5">
              <span v-for="n in offset" :key="`e${n}`" />
              <button
                v-for="d in 31"
                :key="d"
                type="button"
                :aria-pressed="d === selectedDay"
                :aria-label="`${d} Oktober`"
                :class="[
                  'press flex min-h-13 flex-col items-center gap-px rounded-[10px] pt-1.5 text-label font-semibold',
                  d === selectedDay
                    ? 'bg-primary text-white [&_small]:!text-white/85'
                    : d === TODAY.getDate()
                      ? 'text-primary-accent ring-[1.5px] ring-inset ring-primary-accent hover:bg-surface-2'
                      : 'hover:bg-surface-2',
                  d > TODAY.getDate() && d !== selectedDay && 'font-medium text-faint',
                ]"
                @click="selectedDay = d"
              >
                <span class="tabular-nums">{{ d }}</span>
                <small
                  v-if="daySums[d]?.expense"
                  class="text-[9.5px] font-semibold tracking-tight text-bad tabular-nums"
                >
                  {{ formatShort(daySums[d]!.expense, true) }}
                </small>
                <small
                  v-if="daySums[d]?.income"
                  class="text-[9.5px] font-semibold tracking-tight text-primary-accent tabular-nums"
                >
                  +{{ formatShort(daySums[d]!.income, true) }}
                </small>
              </button>
            </div>
          </Card>
          <ListGroup
            v-if="selectedList.length"
            :label="`${selectedDay} Oktober`"
            :aside="`${selectedList.length} transaksi`"
          >
            <TransactionRow
              v-for="t in selectedList"
              :key="t.id"
              v-bind="rowProps(t)"
              deletable
              @delete="remove(t.id)"
            />
          </ListGroup>
          <Card v-else class="mt-3.5">
            <EmptyState
              :icon="CalendarX"
              title="Tidak ada transaksi"
              description="Belum ada catatan di tanggal ini."
            />
          </Card>
        </template>

        <!-- Bulanan -->
        <Card v-else class="mt-3.5 flex flex-col gap-0.5 p-1">
          <ListRow
            v-for="m in months"
            :key="m.key"
            :title="m.name"
            :subtitle="`Masuk ${formatShort(m.income)} · Keluar ${formatShort(m.expense)}`"
            :value="(m.income >= m.expense ? '+' : '') + formatShort(m.income - m.expense)"
            :value-class="m.income >= m.expense ? 'text-primary-accent' : 'text-bad'"
          >
            <template #lead>
              <span
                class="grid size-9 place-items-center rounded-[10px] bg-surface-2 text-xs font-bold text-muted-foreground"
                >{{ m.key }}</span
              >
            </template>
          </ListRow>
        </Card>
      </div>

      <!-- Kolom kanan (>= 1024px): Catat cepat selalu terbuka + pengeluaran teratas -->
      <aside
        v-if="lg"
        class="sticky top-0 hidden flex-col gap-3.5 pt-3.5 lg:flex"
        aria-label="Catat cepat dan ringkasan"
      >
        <Card class="px-3.5 pb-3.5 pt-3">
          <QuickAddPanel ref="inlinePanel" inline title-id="qa-inline-title" />
        </Card>
        <Card class="p-1">
          <CardHead title="Pengeluaran teratas" class="px-2.5 pt-2.5">
            <span class="text-xs text-muted-foreground">Oktober</span>
          </CardHead>
          <HBarList :items="topCats" />
        </Card>
      </aside>
    </div>
  </div>
</template>
