<script setup lang="ts">
import { ChevronRight, Layers, ListFilter, Search, Sigma } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import HBarList from '@/components/charts/HBarList.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import MonthNav from '@/components/ios/MonthNav.vue';
import MonthPickerSheet from '@/components/ios/MonthPickerSheet.vue';
import MonthSwipe from '@/components/ios/MonthSwipe.vue';
import NavBar from '@/components/ios/NavBar.vue';
import SectionHeader from '@/components/ios/SectionHeader.vue';
import SubTabs from '@/components/ios/SubTabs.vue';
import SummaryStrip from '@/components/ios/SummaryStrip.vue';
import BulkTxBar from '@/components/money/BulkTxBar.vue';
import DayGroup from '@/components/money/DayGroup.vue';
import DaySheet from '@/components/money/DaySheet.vue';
import MonthSummary from '@/components/money/MonthSummary.vue';
import PendingRecurring from '@/components/money/PendingRecurring.vue';
import QuickAddPanel from '@/components/money/QuickAddPanel.vue';
import TxCalendar from '@/components/money/TxCalendar.vue';
import TxRow from '@/components/money/TxRow.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import type { Transaction } from '@/features/transactions/api';
import { netAmount, summarize } from '@/features/transactions/effects';
import {
  groupByDay,
  shortDate,
  sumsByDay,
  weeksOf,
  type WeekRow,
} from '@/features/transactions/grouping';
import { useTxSelection } from '@/features/transactions/useBulk';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { useTxFilter } from '@/features/transactions/useTxFilter';
import {
  useMonthsOverview,
  useMonthTransactions,
  useTxHighlight,
  useYearsOverview,
} from '@/features/transactions/useTransactions';
import { formatRupiah, formatShort } from '@/lib/format';
import { dayKey, jakartaParts, MONTHS_LONG, periodDays, periodRangeLabel } from '@/lib/time';

// Tab Transaksi (mockup daily/calendar/weekly/monthly/summary): bar atas
// Cari · ‹ bulan › · Filter, sub-tab lima tampilan, ringkasan tiga kolom.
// Geser daftar = pindah bulan; kepala tanggal = catat di tanggal itu;
// tahan baris = pilih banyak. iPad landscape/desktop: kolom kanan Catat cepat.
definePageMeta({ layout: 'app' });
useHead({ title: 'Transaksi · Money Manager' });

const { canEdit, monthStartDay } = useActiveBook();
const { md, lg } = useBreakpoint();
const ui = useQuickAddUi();
const editor = useTxEditor();
const highlight = useTxHighlight();
const categories = useCategories();
const { rowView } = useTxDisplay();
const selection = useTxSelection();
const filter = useTxFilter();

// ---------- bulan ----------
const todayKey = dayKey(new Date());
const selected = useSelectedMonth();
const { year, month, rangeHint } = selected;
watch(monthStartDay, () => selected.goToday());
const swipeKey = computed(() => `${year.value}-${String(month.value).padStart(2, '0')}`);
const pickerOpen = ref(false);

// Ketuk ulang tab Transaksi (lewat state bersama tab bar) = kembali ke hari ini
const retap = useState('nav:retap:tx', () => 0);
watch(retap, () => {
  selected.goToday();
  view.value = 'daily';
});

const VIEWS = [
  { value: 'daily', label: 'Harian' },
  { value: 'calendar', label: 'Kalender' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'summary', label: 'Ringkasan' },
] as const;
type View = (typeof VIEWS)[number]['value'];
const view = useState<View>('tx:view', () => 'daily');
// Tampilan Tahunan lama sudah masuk ke Bulanan
if (!VIEWS.some((v) => v.value === view.value)) view.value = 'monthly';
watch([view, year, month], () => selection.stop());
onBeforeUnmount(() => selection.stop());

// ---------- cakupan: total yang tampil di Transaksi (mis. Uang bulanan) atau semua ----------
const { accounts, transactionsTotal } = useAccounts();
const showAll = useState('tx:all-accounts', () => false);
watch(
  () => transactionsTotal.value?.id,
  (id, old) => old !== undefined && id !== old && (showAll.value = false),
);
const scope = computed(() => (showAll.value ? null : transactionsTotal.value));
const scopeId = computed(() => scope.value?.id ?? null);
const scopeIds = computed(() =>
  scope.value
    ? new Set(
        (accounts.data.value ?? []).filter((a) => a.total_id === scope.value!.id).map((a) => a.id),
      )
    : null,
);
watch(scopeId, () => selection.stop());

// ---------- data ----------
const { data: txs, isPending, error } = useMonthTransactions(year, month);
const rootOf = (id: string | null) =>
  id ? (categories.byId.value.get(id)?.parent_id ?? id) : null;
const list = computed(() => {
  const ids = scopeIds.value;
  const scoped = ids
    ? (txs.value ?? []).filter(
        (t) => ids.has(t.account_id) || (!!t.to_account_id && ids.has(t.to_account_id)),
      )
    : (txs.value ?? []);
  return filter.apply(scoped, rootOf);
});
const summary = computed(() => summarize(list.value));
const days = computed(() => groupByDay(list.value));
const sums = computed(() => sumsByDay(list.value));
const periodKeys = computed(() => periodDays(year.value, month.value, monthStartDay.value));
const weeks = computed(() => weeksOf(periodKeys.value, sums.value, todayKey));
const weekLabel = (w: WeekRow) =>
  w.from === w.to ? shortDate(w.from) : `${shortDate(w.from)} – ${shortDate(w.to)}`;

/** Mingguan: ketuk minggu = Harian, gulir ke hari terbaru di minggu itu */
function openWeek(w: WeekRow) {
  view.value = 'daily';
  const day = days.value.find((d) => d.key >= w.from && d.key <= w.to);
  if (day) nextTick(() => document.getElementById(`day-${day.key}`)?.scrollIntoView());
}

// ---------- bulanan dan tahunan ----------
const { data: overview } = useMonthsOverview(year, scopeId);
const months = computed(() =>
  (overview.value ?? [])
    .slice()
    .sort((a, b) => b.month - a.month)
    .map((m) => ({ ...m, net: m.income - m.expense })),
);
const isMonthly = computed(() => view.value === 'monthly');
const { data: yearsData } = useYearsOverview(isMonthly, scopeId);
const years = computed(() =>
  (yearsData.value ?? []).map((y) => ({ ...y, net: y.income - y.expense })),
);
function pickMonth(m: number) {
  if (m === month.value) return;
  selected.set(year.value, m);
}

// Bulan lalu untuk perbandingan di Ringkasan
const prevYear = computed(() => (month.value === 1 ? year.value - 1 : year.value));
const { data: prevOverview } = useMonthsOverview(prevYear, scopeId);
const prev = computed(() => {
  const m = month.value === 1 ? 12 : month.value - 1;
  const row = prevOverview.value?.find((r) => r.month === m);
  return row ? { income: row.income, expense: row.expense } : null;
});

// ---------- catat di tanggal tertentu ----------
function addOn(key: string) {
  if (!canEdit.value) return;
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
    accountId: null,
    toAccountId: null,
    categoryId: null,
    note: '',
    occurredAt,
  });
}

// ---------- kalender: lembar hari ----------
const sheetDay = ref(todayKey);
const sheetOpen = ref(false);
const sheetItems = computed(() => days.value.find((d) => d.key === sheetDay.value)?.items ?? []);
function openDay(key: string) {
  sheetDay.value = key;
  sheetOpen.value = true;
}
function addFromSheet() {
  sheetOpen.value = false;
  addOn(sheetDay.value);
}
function openFromSheet(t: Transaction) {
  sheetOpen.value = false;
  editor.edit(t);
}

// ---------- pilih banyak: tahan baris ----------
function startSelect(t: Transaction) {
  if (!canEdit.value) return;
  selection.selecting.value = true;
  if (!selection.has(t.id)) selection.toggle(t.id);
}
function tapRow(t: Transaction) {
  if (selection.selecting.value) selection.toggle(t.id);
  else editor.edit(t);
}

// ---------- kolom kanan (>= 1024px) ----------
const topCats = computed(() => {
  const by = new Map<string, number>();
  for (const t of list.value) {
    if (t.type !== 'expense' || t.is_adjustment || !t.category_id) continue;
    const key = rootOf(t.category_id)!;
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

function addFirst() {
  if (lg.value) ui.focusTick.value++;
  else if (md.value) ui.open.value = true;
  else addOn(todayKey);
}

// ---------- sorotan transaksi baru ----------
const rows = ref<Record<string, InstanceType<typeof TxRow> | null>>({});
watch([highlight, list], ([id]) => {
  if (!id || !rows.value[id]) return;
  nextTick(() => {
    rows.value[id]?.flash();
    highlight.value = null;
  });
});
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-0 md:mt-0 md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Transaksi" class="sticky top-0 md:static">
      <template #left>
        <IconButton label="Cari" to="/search"><Search aria-hidden="true" /></IconButton>
      </template>
      <template #center>
        <MonthNav
          :label="selected.label.value"
          :long-label="selected.longLabel.value"
          :hint="rangeHint"
          :can-next="selected.canNext.value"
          @prev="selected.shift(-1)"
          @next="selected.shift(1)"
          @pick="pickerOpen = true"
        />
      </template>
      <template #right>
        <IconButton
          :label="filter.applied.value ? 'Filter aktif' : 'Filter'"
          to="/filter"
          class="relative"
        >
          <ListFilter aria-hidden="true" />
          <span
            v-if="filter.applied.value"
            class="absolute right-2 top-2 size-2 rounded-full bg-primary-accent"
            aria-hidden="true"
          />
        </IconButton>
      </template>
      <SubTabs v-model="view" :options="VIEWS" label="Tampilan transaksi" />
    </NavBar>

    <!-- Total yang tampil di Transaksi (mockup .scope): ketuk untuk semua akun -->
    <div
      v-if="transactionsTotal"
      class="flex items-center gap-2 bg-card px-4 py-2 shadow-[inset_0_0.5px_0_var(--sep)]"
    >
      <button
        type="button"
        :aria-pressed="!showAll"
        :class="[
          'scope-chip inline-flex h-[30px] items-center gap-[5px] rounded-full px-[11px] text-meta font-semibold active:scale-[0.96] [&_svg]:size-3.5',
          showAll ? 'bg-fill' : 'bg-primary-soft text-primary-accent',
        ]"
        @click="showAll = !showAll"
      >
        <component :is="showAll ? Layers : Sigma" stroke-width="2.6" aria-hidden="true" />
        {{ showAll ? 'Semua akun' : transactionsTotal.name }}
        <span class="font-medium text-muted-foreground">· ganti</span>
      </button>
      <span v-if="!showAll" class="ml-auto text-meta font-semibold text-muted-foreground">{{
        formatRupiah(transactionsTotal.sum)
      }}</span>
    </div>

    <!-- Filter aktif: ringkas dan bisa dihapus -->
    <div
      v-if="filter.applied.value"
      class="flex items-center gap-2 bg-primary-soft px-4 py-2 text-meta text-primary-accent"
    >
      <ListFilter class="size-4 shrink-0" aria-hidden="true" />
      <span class="flex-1">Filter aktif: {{ list.length }} transaksi</span>
      <button type="button" class="font-semibold" @click="filter.applied.value = null">
        Hapus
      </button>
    </div>

    <SummaryStrip
      dense
      :items="[
        { label: 'Pemasukan', value: formatRupiah(summary.income), tone: 'inc' },
        { label: 'Pengeluaran', value: formatRupiah(summary.expense), tone: 'exp' },
        { label: 'Total', value: formatRupiah(summary.net) },
      ]"
    />

    <div
      class="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-5"
    >
      <MonthSwipe
        :month-key="swipeKey"
        :prev-label="selected.neighborLabel(-1)"
        :next-label="selected.neighborLabel(1)"
        :can-next="selected.canNext.value"
        :disabled="md || selection.selecting.value"
        class="min-h-[60dvh]"
        @shift="selected.shift"
      >
        <PendingRecurring />

        <EmptyCard v-if="error" title="Transaksi gagal dimuat" :description="error.message" />
        <EmptyCard v-else-if="isPending && !txs" title="Memuat transaksi…" />

        <!-- Harian -->
        <template v-else-if="view === 'daily'">
          <EmptyCard
            v-if="!list.length"
            title="Belum ada transaksi"
            :description="`Ketuk + atau tanggal untuk mencatat di ${MONTHS_LONG[month - 1]}.`"
          >
            <IosButton v-if="canEdit" variant="soft" @click="addFirst">Catat transaksi</IosButton>
          </EmptyCard>
          <DayGroup
            v-for="d in days"
            :key="d.key"
            :day-key="d.key"
            :income="d.income"
            :expense="d.expense"
            :addable="canEdit && !selection.selecting.value"
            @add="addOn(d.key)"
          >
            <TxRow
              v-for="t in d.items"
              :id="t.id"
              :key="t.id"
              :ref="(el) => (rows[t.id] = el as InstanceType<typeof TxRow> | null)"
              v-bind="rowView(t)"
              :selectable="canEdit"
              :selecting="selection.selecting.value"
              :selected="selection.has(t.id)"
              @open="tapRow(t)"
              @longpress="startSelect(t)"
            />
          </DayGroup>
          <BulkTxBar v-if="selection.selecting.value" :list="list" />
        </template>

        <!-- Kalender -->
        <template v-else-if="view === 'calendar'">
          <TxCalendar :days="periodKeys" :sums="sums" :today="todayKey" @pick="openDay" />
          <p class="mx-4 mt-3 text-center text-meta text-muted-foreground">
            Ketuk tanggal untuk melihat transaksi atau mencatat di hari itu.
          </p>
        </template>

        <!-- Mingguan -->
        <div v-else-if="view === 'weekly'" class="mt-2.5">
          <button
            v-for="w in weeks"
            :key="w.from"
            type="button"
            :aria-current="w.current ? 'true' : undefined"
            :class="[
              'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-[11px] text-left shadow-[inset_0_-0.5px_0_var(--sep)] active:bg-fill-press',
              w.current ? 'bg-primary-soft' : 'bg-card',
            ]"
            @click="openWeek(w)"
          >
            <span class="text-body font-semibold">
              {{ weekLabel(w) }}
              <small class="mt-px block text-[12.5px] font-medium text-muted-foreground">{{
                w.current
                  ? 'Minggu ini'
                  : `${Math.round((Date.parse(w.to) - Date.parse(w.from)) / 864e5) + 1} hari`
              }}</small>
            </span>
            <span class="flex flex-col items-end gap-px text-[13.5px] font-semibold">
              <span class="text-inc">{{ formatRupiah(w.income) }}</span>
              <span class="text-exp">{{ formatRupiah(w.expense) }}</span>
              <span>{{ formatRupiah(w.income - w.expense) }}</span>
            </span>
          </button>
        </div>

        <!-- Bulanan: bulan di tahun ini, bulan terpilih terbuka per minggu; lalu per tahun -->
        <template v-else-if="view === 'monthly'">
          <EmptyCard
            v-if="!months.length"
            title="Belum ada transaksi"
            :description="`Belum ada catatan di tahun ${year}.`"
          />
          <div v-else class="mt-2.5">
            <template v-for="m in months" :key="m.month">
              <button
                type="button"
                :aria-expanded="m.month === month"
                :class="[
                  'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-[11px] text-left shadow-[inset_0_-0.5px_0_var(--sep)] active:bg-fill-press',
                  m.month === month ? 'bg-primary-soft' : 'bg-card',
                ]"
                @click="pickMonth(m.month)"
              >
                <span class="text-body font-semibold">
                  {{ MONTHS_LONG[m.month - 1] }}
                  <small class="mt-px block text-[12.5px] font-medium text-muted-foreground">{{
                    periodRangeLabel(year, m.month, monthStartDay) || `${m.tx_count} transaksi`
                  }}</small>
                </span>
                <span class="flex flex-col items-end gap-px text-[13.5px] font-semibold">
                  <span class="text-inc">{{ formatRupiah(m.income) }}</span>
                  <span class="text-exp">{{ formatRupiah(m.expense) }}</span>
                  <span>{{ formatRupiah(m.net) }}</span>
                </span>
              </button>
              <template v-if="m.month === month">
                <div
                  v-for="w in weeks"
                  :key="w.from"
                  class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 bg-surface-2 py-[11px] pl-8 pr-4 shadow-[inset_0_-0.5px_0_var(--sep)]"
                >
                  <span class="text-[14px] font-medium">{{ weekLabel(w) }}</span>
                  <span class="flex flex-col items-end gap-px text-[13.5px] font-semibold">
                    <span class="text-inc">{{ formatRupiah(w.income) }}</span>
                    <span class="text-exp">{{ formatRupiah(w.expense) }}</span>
                  </span>
                </div>
              </template>
            </template>
          </div>
          <template v-if="years.length > 1">
            <SectionHeader label="Per tahun" />
            <div class="mx-4 overflow-hidden rounded-group bg-card">
              <button
                v-for="y in years"
                :key="y.year"
                type="button"
                :class="[
                  'year-row flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-fill-press',
                  y.year === year && 'bg-primary-soft',
                ]"
                @click="
                  selected.set(
                    y.year,
                    y.year === selected.current.value.year ? selected.current.value.month : 12,
                  )
                "
              >
                <span class="flex min-w-0 flex-1 flex-col">
                  <b class="text-row font-medium">{{ y.year }}</b>
                  <span class="text-meta text-muted-foreground"
                    >Masuk {{ formatShort(y.income) }} · Keluar {{ formatShort(y.expense) }}</span
                  >
                </span>
                <span :class="['text-row font-semibold', y.net >= 0 ? 'text-inc' : 'text-exp']">{{
                  formatShort(y.net)
                }}</span>
                <ChevronRight
                  class="size-[18px] text-chevron"
                  stroke-width="2.6"
                  aria-hidden="true"
                />
              </button>
            </div>
          </template>
        </template>

        <!-- Ringkasan -->
        <MonthSummary
          v-else
          :year="year"
          :month="month"
          :list="list"
          :today="todayKey"
          :prev="prev"
        />
      </MonthSwipe>

      <!-- Kolom kanan (>= 1024px): Catat cepat selalu terbuka + pengeluaran teratas -->
      <aside
        v-if="lg"
        class="sticky top-0 hidden max-h-dvh flex-col gap-3.5 overflow-y-auto overscroll-contain pb-3.5 pt-3.5 lg:flex"
        aria-label="Catat cepat dan ringkasan"
      >
        <Card v-if="canEdit" class="px-3.5 pb-3.5 pt-3">
          <QuickAddPanel ref="inlinePanel" inline with-import title-id="qa-inline-title" />
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

    <MonthPickerSheet
      v-model:open="pickerOpen"
      :year="year"
      :month="month"
      :current="selected.current.value"
      :max-index="selected.maxIndex.value"
      @pick="selected.set"
    />
    <DaySheet
      v-model:open="sheetOpen"
      :day-key="sheetDay"
      :items="sheetItems"
      :sums="sums[sheetDay] ?? { income: 0, expense: 0 }"
      :can-add="canEdit"
      @add="addFromSheet"
      @open="openFromSheet"
    />
  </div>
</template>

<style scoped>
.scope-chip {
  transition: transform 120ms var(--ease-out);
}
.year-row + .year-row {
  box-shadow: inset 0 0.5px 0 var(--sep);
}
</style>
