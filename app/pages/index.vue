<script setup lang="ts">
import { CalendarX, Inbox, Plus, Search } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import HBarList from '@/components/charts/HBarList.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import MonthPicker from '@/components/layout/MonthPicker.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import PageHero from '@/components/layout/PageHero.vue';
import StatChip from '@/components/layout/StatChip.vue';
import PendingRecurring from '@/components/money/PendingRecurring.vue';
import QuickAddPanel from '@/components/money/QuickAddPanel.vue';
import TransactionRow from '@/components/money/TransactionRow.vue';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import type { Transaction } from '@/features/transactions/api';
import { netAmount, summarize } from '@/features/transactions/effects';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import {
  useMonthsOverview,
  useMonthTransactions,
  useTransactionMutations,
  useTxHighlight,
} from '@/features/transactions/useTransactions';
import { formatRupiah, formatShort } from '@/lib/format';
import { shouldCommit } from '@/lib/gesture';
import {
  addMonths,
  dayKey,
  dayLabel,
  MONTHS_LONG,
  MONTHS_SHORT,
  periodDays,
  periodOf,
  periodRangeLabel,
} from '@/lib/time';

definePageMeta({ layout: 'app' });
useHead({ title: 'Transaksi · Money Manager' });

const { canEdit, monthStartDay } = useActiveBook();
const { md, lg } = useBreakpoint();
const ui = useQuickAddUi();
const editor = useTxEditor();
const mutations = useTransactionMutations();
const highlight = useTxHighlight();
const categories = useCategories();
const { rowProps } = useTxDisplay();

// ---------- periode bulan aktif (bertahan saat pindah tab) ----------
// Periode mengikuti tanggal awal bulan buku: awal 25 → Oktober = 25 Okt – 24 Nov
const todayKey = dayKey(new Date());
const current = computed(() => periodOf(todayKey, monthStartDay.value));
const year = useState('tx:year', () => current.value.year);
const month = useState('tx:month', () => current.value.month);
const isCurrent = computed(
  () => year.value === current.value.year && month.value === current.value.month,
);
// Tanggal awal berubah (buku lain / pengaturan diganti): kembali ke periode berjalan
watch(monthStartDay, () => {
  year.value = current.value.year;
  month.value = current.value.month;
});
const rangeHint = computed(() => periodRangeLabel(year.value, month.value, monthStartDay.value));

function shiftMonth(delta: number) {
  const next = addMonths(year.value, month.value, delta);
  year.value = next.year;
  month.value = next.month;
}

// Geser kepala halaman ke kiri/kanan untuk pindah bulan
const header = ref<HTMLElement>();
useSwipe(header, {
  axis: 'x',
  threshold: 14,
  canStart: (e) => !(e.target as HTMLElement).closest('button'),
  onMove: () => {},
  onEnd: ({ delta, elapsedMs }) => {
    const width = header.value?.offsetWidth ?? 1;
    if (shouldCommit(Math.abs(delta), width, elapsedMs, { ratio: 0.25, minFlick: 30 }))
      shiftMonth(delta < 0 ? 1 : -1);
  },
});

const VIEWS = [
  { value: 'daily', label: 'Harian' },
  { value: 'calendar', label: 'Kalender' },
  { value: 'monthly', label: 'Bulanan' },
] as const;
const view = useState<(typeof VIEWS)[number]['value']>('tx:view', () => 'daily');

// ---------- data ----------
const { data: txs, isPending, error } = useMonthTransactions(year, month);
const list = computed(() => txs.value ?? []);
const summary = computed(() => summarize(list.value));
const used = computed(() =>
  summary.value.income ? summary.value.expense / summary.value.income : 0,
);

const days = computed(() => {
  const groups = new Map<string, Transaction[]>();
  for (const t of list.value) {
    const key = dayKey(t.occurred_at);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items, net: summarize(items).net }));
});

const signed = (n: number) => (n ? (n > 0 ? '+' : '−') + formatRupiah(Math.abs(n)) : '');

// ---------- kalender (tanggal-tanggal dalam periode, bisa melewati dua bulan) ----------
const calendarDays = computed(() => periodDays(year.value, month.value, monthStartDay.value));
const firstKey = () => (isCurrent.value ? todayKey : calendarDays.value[0]!);
const selectedDay = ref(firstKey());
watch([year, month, monthStartDay], () => (selectedDay.value = firstKey()));
const offset = computed(() => {
  const [y, m, d] = calendarDays.value[0]!.split('-').map(Number) as [number, number, number];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
});
const dayNum = (key: string) => Number(key.slice(8));
const dayName = (key: string) => `${dayNum(key)} ${MONTHS_LONG[Number(key.slice(5, 7)) - 1]}`;
/** Tanggal 1 bulan berikutnya di tengah periode diberi nama bulannya */
const cellLabel = (key: string, i: number) =>
  i > 0 && dayNum(key) === 1
    ? `1 ${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]}`
    : String(dayNum(key));
const daySums = computed(() => {
  const sums: Record<string, { income: number; expense: number }> = {};
  for (const t of list.value) {
    if (t.is_adjustment) continue;
    const s = (sums[dayKey(t.occurred_at)] ??= { income: 0, expense: 0 });
    if (t.type === 'income') s.income += netAmount(t);
    if (t.type === 'expense') s.expense += netAmount(t);
  }
  return sums;
});
const selectedList = computed(() =>
  list.value.filter((t) => dayKey(t.occurred_at) === selectedDay.value),
);
const isFuture = (key: string) => key > todayKey;

// ---------- bulanan ----------
const { data: overview } = useMonthsOverview(year);
const months = computed(() =>
  (overview.value ?? [])
    .slice()
    .sort((a, b) => b.month - a.month)
    .map((m) => ({ ...m, net: m.income - m.expense })),
);

// ---------- kolom kanan ----------
const topCats = computed(() => {
  const by = new Map<string, number>();
  for (const t of list.value) {
    if (t.type !== 'expense' || t.is_adjustment || !t.category_id) continue;
    // Gabungkan subkategori ke induknya
    const c = categories.byId.value.get(t.category_id);
    const key = c?.parent_id ?? t.category_id;
    by.set(key, (by.get(key) ?? 0) + netAmount(t));
  }
  return [...by.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, value]) => ({
      id,
      label: categories.label(id),
      value,
      display: formatShort(value),
      ...categories.style(id),
    }));
});

const inlinePanel = ref<InstanceType<typeof QuickAddPanel>>();
watch(ui.focusTick, () => nextTick(() => inlinePanel.value?.focus()));

// ---------- sorotan transaksi baru ----------
const rows = ref<Record<string, InstanceType<typeof TransactionRow> | null>>({});
watch([highlight, list], ([id]) => {
  if (!id || !rows.value[id]) return;
  nextTick(() => {
    rows.value[id]?.flash();
    highlight.value = null;
  });
});

function remove(t: Transaction) {
  mutations.removeWithUndo(t, t.note || 'Transaksi');
}

function addFirst() {
  if (lg.value) ui.focusTick.value++;
  else if (md.value) ui.open.value = true;
  else editor.create();
}
</script>

<template>
  <div>
    <div ref="header" class="touch-pan-y">
      <PageHeader title="Transaksi" :summary="`Sisa ${formatShort(summary.net)}`">
        <template #actions>
          <MonthPicker
            :label="`${MONTHS_SHORT[month - 1]} ${year}`"
            :hint="rangeHint"
            @prev="shiftMonth(-1)"
            @next="shiftMonth(1)"
          />
          <HeaderButton label="Cari" @click="navigateTo('/search')"
            ><Search aria-hidden="true"
          /></HeaderButton>
        </template>
        <PageHero
          :label="`Sisa ${MONTHS_LONG[month - 1]}`"
          :value="formatRupiah(summary.net)"
          :progress="{ label: 'Terpakai dari pemasukan', value: used }"
        />
        <div class="flex flex-wrap gap-1.5">
          <StatChip label="Masuk" :value="formatShort(summary.income)" tone="ok" />
          <StatChip label="Keluar" :value="formatShort(summary.expense)" tone="bad" />
          <StatChip label="Transaksi" :value="list.length" />
        </div>
        <SegmentedControl v-model="view" :options="VIEWS" label="Tampilan" variant="on-grad" />
      </PageHeader>
    </div>

    <div
      class="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-5"
    >
      <div>
        <PendingRecurring />
        <Card v-if="error" class="mt-3.5">
          <EmptyState
            :icon="CalendarX"
            title="Transaksi gagal dimuat"
            :description="error.message"
          />
        </Card>
        <Card v-else-if="isPending" class="mt-3.5 p-1"><Skeleton :rows="5" /></Card>

        <!-- Harian -->
        <template v-else-if="view === 'daily'">
          <Card v-if="!list.length" class="mt-3.5">
            <EmptyState
              :icon="Inbox"
              title="Belum ada transaksi"
              :description="`Belum ada catatan di ${MONTHS_LONG[month - 1]} ${year}.`"
            >
              <Button v-if="canEdit" variant="soft" @click="addFirst"
                ><Plus />Catat transaksi</Button
              >
            </EmptyState>
          </Card>
          <ListGroup
            v-for="d in days"
            :key="d.key"
            :label="dayLabel(d.items[0]!.occurred_at)"
            :aside="signed(d.net)"
            :aside-class="d.net > 0 ? 'text-primary-accent' : 'text-bad'"
          >
            <TransactionRow
              v-for="t in d.items"
              :key="t.id"
              :ref="(el) => (rows[t.id] = el as InstanceType<typeof TransactionRow> | null)"
              v-bind="rowProps(t)"
              :deletable="canEdit"
              @select="editor.edit(t)"
              @delete="remove(t)"
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
                v-for="(d, i) in calendarDays"
                :key="d"
                type="button"
                :aria-pressed="d === selectedDay"
                :aria-label="dayName(d)"
                :class="[
                  'press flex min-h-13 flex-col items-center gap-px rounded-[10px] pt-1.5 text-label font-semibold',
                  d === selectedDay
                    ? 'bg-primary text-white [&_small]:!text-white/85'
                    : d === todayKey
                      ? 'text-primary-accent ring-[1.5px] ring-inset ring-primary-accent hover:bg-surface-2'
                      : 'hover:bg-surface-2',
                  isFuture(d) && d !== selectedDay && 'font-medium text-faint',
                ]"
                @click="selectedDay = d"
              >
                <span class="tabular-nums">{{ cellLabel(d, i) }}</span>
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
            :label="dayName(selectedDay)"
            :aside="`${selectedList.length} transaksi`"
          >
            <TransactionRow
              v-for="t in selectedList"
              :key="t.id"
              v-bind="rowProps(t)"
              :deletable="canEdit"
              @select="editor.edit(t)"
              @delete="remove(t)"
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
        <template v-else>
          <Card v-if="!months.length" class="mt-3.5">
            <EmptyState
              :icon="Inbox"
              title="Belum ada transaksi"
              :description="`Belum ada catatan di tahun ${year}.`"
            />
          </Card>
          <Card v-else class="mt-3.5 flex flex-col gap-0.5 p-1">
            <ListRow
              v-for="m in months"
              :key="m.month"
              as="button"
              :title="`${MONTHS_LONG[m.month - 1]} ${year}`"
              :subtitle="
                [
                  periodRangeLabel(year, m.month, monthStartDay),
                  `Masuk ${formatShort(m.income)} · Keluar ${formatShort(m.expense)} · ${m.tx_count} transaksi`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              "
              :value="(m.net >= 0 ? '+' : '') + formatShort(m.net)"
              :value-class="m.net >= 0 ? 'text-primary-accent' : 'text-bad'"
              @click="((month = m.month), (view = 'daily'))"
            >
              <template #lead>
                <span
                  class="grid size-9 place-items-center rounded-[10px] bg-surface-2 text-xs font-bold text-muted-foreground"
                >
                  {{ MONTHS_SHORT[m.month - 1] }}
                </span>
              </template>
            </ListRow>
          </Card>
        </template>
      </div>

      <!-- Kolom kanan (>= 1024px): Catat cepat selalu terbuka + pengeluaran teratas -->
      <aside
        v-if="lg"
        class="sticky top-0 hidden flex-col gap-3.5 pt-3.5 lg:flex"
        aria-label="Catat cepat dan ringkasan"
      >
        <Card v-if="canEdit" class="px-3.5 pb-3.5 pt-3">
          <QuickAddPanel ref="inlinePanel" inline title-id="qa-inline-title" />
        </Card>
        <Card class="p-1">
          <CardHead title="Pengeluaran teratas" class="px-2.5 pt-2.5">
            <span class="text-xs text-muted-foreground">{{ MONTHS_LONG[month - 1] }}</span>
          </CardHead>
          <HBarList v-if="topCats.length" :items="topCats" />
          <p v-else class="m-0 px-2.5 pb-3 pt-1 text-meta text-muted-foreground">
            Belum ada pengeluaran bulan ini.
          </p>
        </Card>
      </aside>
    </div>
  </div>
</template>
