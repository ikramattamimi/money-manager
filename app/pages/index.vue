<script setup lang="ts">
import { ChevronRight, Layers, ListFilter, Search, Sigma } from '@lucide/vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
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
import TxCalendar from '@/components/money/TxCalendar.vue';
import TxRow from '@/components/money/TxRow.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import type { Transaction } from '@/features/transactions/api';
import { summarize } from '@/features/transactions/effects';
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
// tahan baris = pilih banyak. Semua ukuran hanya menampilkan daftar; form catat
// dibuka lewat tombol + (dialog di iPad/desktop).
definePageMeta({ layout: 'app' });
useHead({ title: 'Transaksi · Money Manager' });

const { canEdit, monthStartDay } = useActiveBook();
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
const { accounts, totalViews } = useAccounts();
// Bawaan semua akun; total dipilih lewat tombol di samping Filter (null = semua akun)
const scopeChoice = useState<string | null>('tx:scope', () => null);
const scope = computed(
  () => (scopeChoice.value && totalViews.value.find((t) => t.id === scopeChoice.value)) || null,
);
const scopeOpen = ref(false);
function pickScope(id: string | null) {
  scopeChoice.value = id;
  scopeOpen.value = false;
}
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
const {
  data: txs,
  isPending,
  isPlaceholderData: switching,
  error,
} = useMonthTransactions(year, month, { keep: true });
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
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-0 md:mt-0 md:flow-root md:overflow-clip md:rounded-2xl"
  >
    <NavBar title="Transaksi">
      <template #left>
        <IconButton label="Cari" to="/search"><Search aria-hidden="true" /></IconButton>
        <!-- Penyeimbang dua tombol kanan supaya bulan tetap di tengah -->
        <span v-if="totalViews.length" class="size-11 shrink-0" aria-hidden="true" />
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
        <!-- Cakupan: semua akun (bawaan) atau salah satu total akun -->
        <IconButton
          v-if="totalViews.length"
          :label="scope ? `Cakupan: ${scope.name}` : 'Cakupan: semua akun'"
          :accent="!!scope"
          @click="scopeOpen = true"
        >
          <component :is="scope ? Sigma : Layers" aria-hidden="true" />
        </IconButton>
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
      <!-- Nominal ikut menempel bersama header -->
      <SummaryStrip
        dense
        :items="[
          { label: 'Pemasukan', value: formatRupiah(summary.income), tone: 'inc' },
          { label: 'Pengeluaran', value: formatRupiah(summary.expense), tone: 'exp' },
          { label: 'Total', value: formatRupiah(summary.net) },
        ]"
      />
    </NavBar>

    <!-- Total akun terpilih: ringkas dan bisa dilepas -->
    <div
      v-if="scope"
      class="flex items-center gap-2 bg-primary-soft px-4 py-2 text-meta text-primary-accent"
    >
      <Sigma class="size-4 shrink-0" stroke-width="2.6" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate">{{ scope.name }} · {{ formatRupiah(scope.sum) }}</span>
      <button type="button" class="font-semibold" @click="pickScope(null)">Semua akun</button>
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

    <MonthSwipe
      :month-key="swipeKey"
      :prev-label="selected.neighborLabel(-1)"
      :next-label="selected.neighborLabel(1)"
      :can-next="selected.canNext.value"
      :loading="switching"
      :disabled="selection.selecting.value"
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
          <IosButton v-if="canEdit" variant="soft" @click="addOn(todayKey)"
            >Catat transaksi</IosButton
          >
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
            <small class="mt-px block text-note font-medium text-muted-foreground">{{
              w.current
                ? 'Minggu ini'
                : `${Math.round((Date.parse(w.to) - Date.parse(w.from)) / 864e5) + 1} hari`
            }}</small>
          </span>
          <span class="flex flex-col items-end gap-px text-amount font-semibold">
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
                <small class="mt-px block text-note font-medium text-muted-foreground">{{
                  periodRangeLabel(year, m.month, monthStartDay) || `${m.tx_count} transaksi`
                }}</small>
              </span>
              <span class="flex flex-col items-end gap-px text-amount font-semibold">
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
                <span class="text-label font-medium">{{ weekLabel(w) }}</span>
                <span class="flex flex-col items-end gap-px text-amount font-semibold">
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
              <span :class="['text-amount font-semibold', y.net >= 0 ? 'text-inc' : 'text-exp']">{{
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

    <IosSheet v-model:open="scopeOpen" title="Tampilkan akun">
      <button
        v-for="opt in [
          { id: null, name: 'Semua akun', caption: 'Bawaan', sum: null },
          ...totalViews.map((t) => ({
            id: t.id,
            name: t.name,
            caption: `${t.accounts.length} akun`,
            sum: t.sum,
          })),
        ]"
        :key="opt.id ?? 'all'"
        type="button"
        :aria-pressed="(scope?.id ?? null) === opt.id"
        class="flex min-h-[54px] w-full items-center gap-2.5 px-1 py-1.5 text-left shadow-[inset_0_-0.5px_0_var(--sep)] last:shadow-none"
        @click="pickScope(opt.id)"
      >
        <component
          :is="opt.id ? Sigma : Layers"
          :class="[
            'size-5 shrink-0',
            (scope?.id ?? null) === opt.id ? 'text-primary-accent' : 'text-ter',
          ]"
          stroke-width="2.4"
          aria-hidden="true"
        />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-label font-medium">{{ opt.name }}</span>
          <small class="text-note text-muted-foreground">{{ opt.caption }}</small>
        </span>
        <span v-if="opt.sum !== null" class="shrink-0 text-label text-muted-foreground">{{
          formatRupiah(opt.sum)
        }}</span>
        <b
          v-if="(scope?.id ?? null) === opt.id"
          class="w-4 shrink-0 text-center text-primary-accent"
          >✓</b
        >
        <span v-else class="w-4 shrink-0" aria-hidden="true" />
      </button>
    </IosSheet>
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
.year-row + .year-row {
  box-shadow: inset 0 0.5px 0 var(--sep);
}
</style>
