<script setup lang="ts">
import { ChevronDown, ChevronRight } from '@lucide/vue';
import Donut from '@/components/charts/Donut.vue';
import TrendBars from '@/components/charts/TrendBars.vue';
import { IOS_TONE } from '@/components/data/tone';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import MonthNav from '@/components/ios/MonthNav.vue';
import MonthPickerSheet from '@/components/ios/MonthPickerSheet.vue';
import MonthSwipe from '@/components/ios/MonthSwipe.vue';
import NavBar from '@/components/ios/NavBar.vue';
import Segmented from '@/components/ios/Segmented.vue';
import SubTabs from '@/components/ios/SubTabs.vue';
import BudgetOverview from '@/components/money/BudgetOverview.vue';
import InsightCard from '@/components/money/InsightCard.vue';
import { hasNext, shiftPeriod, todayWib, type PeriodKind } from '@/features/stats/period';
import {
  useBreakdown,
  useNoteBreakdown,
  useStatsPeriod,
  useTrend,
} from '@/features/stats/useStats';
import { formatRupiah } from '@/lib/format';
import { MONTHS_LONG, MONTHS_SHORT, periodOf, periodStartDate } from '@/lib/time';

// Tab Statistik (mockup stats, stats-budget, stats-note): bar ‹ periode › +
// pil jenis periode, sub-tab Statistik · Budget · Catatan. Statistik: tombol
// Pemasukan/Pengeluaran, donat, daftar kategori dengan persen → rincian.
// Geser isi = periode berikutnya/sebelumnya. Agregasi di database (RPC).
definePageMeta({ layout: 'app' });
useHead({ title: 'Statistik · Money Manager' });

const { period, bounds, monthStartDay } = useStatsPeriod();

// Ketuk ulang tab Statistik (seperti Transaksi) = kembali ke bulan ini, dari
// jenis periode apa pun (minggu, tahun, rentang) atau bulan lain
const retap = useState('nav:retap:stats', () => 0);
watch(retap, () => {
  period.value = { kind: 'month', anchor: todayWib() };
});
const { md } = useBreakpoint();
const kind = useState<'expense' | 'income'>('stats:kind', () => 'expense');
const SUBS = [
  { value: 'stats', label: 'Statistik' },
  { value: 'budget', label: 'Budget' },
  { value: 'note', label: 'Catatan' },
] as const;
const sub = useState<(typeof SUBS)[number]['value']>('stats:sub', () => 'stats');

// ---------- periode ----------
const canNext = computed(() => hasNext(period.value, new Date(), monthStartDay.value));
const shift = (delta: number) =>
  (period.value = shiftPeriod(period.value, delta, monthStartDay.value));
const neighbor = (delta: number) => {
  const p = shiftPeriod(period.value, delta, monthStartDay.value);
  const label = (p.kind === 'month' ? MONTHS_SHORT[Number(p.anchor.slice(5, 7)) - 1] : '') ?? '';
  return p.kind === 'month'
    ? label
    : p.kind === 'year'
      ? p.anchor.slice(0, 4)
      : delta < 0
        ? 'Sebelumnya'
        : 'Berikutnya';
};
const swipeKey = computed(() => `${period.value.kind}:${bounds.value.from}`);

const KINDS: { value: PeriodKind; label: string; letter: string }[] = [
  { value: 'week', label: 'Mingguan', letter: 'M' },
  { value: 'month', label: 'Bulanan', letter: 'B' },
  { value: 'year', label: 'Tahunan', letter: 'T' },
  { value: 'range', label: 'Periode', letter: 'P' },
];
const currentKind = computed(() => KINDS.find((k) => k.value === period.value.kind)!);
/** Bulan disingkat seperti bar Transaksi ("Nov 2026"); jenis lain apa adanya */
const headerLabel = computed(() => {
  const label = bounds.value.label;
  if (period.value.kind !== 'month') return label;
  const i = MONTHS_LONG.findIndex((m) => label.startsWith(m));
  return i < 0 ? label : label.replace(MONTHS_LONG[i]!, MONTHS_SHORT[i]!);
});
const periodOpen = ref(false);
const rangeFrom = ref(period.value.from ?? `${todayWib().slice(0, 8)}01`);
const rangeTo = ref(period.value.to ?? todayWib());
function pickKind(k: PeriodKind) {
  const today = todayWib();
  if (k === 'range') {
    period.value = { kind: 'range', anchor: today, from: rangeFrom.value, to: rangeTo.value };
    return;
  }
  period.value = { kind: k, anchor: period.value.kind === 'range' ? today : period.value.anchor };
  periodOpen.value = false;
}
// Ketuk judul periode = pilih periode tertentu sesuai jenisnya: bulan (grid
// bulan seperti Transaksi), minggu (tanggal mana saja di minggu itu), tahun
// (daftar tahun). Rentang memakai lembar jenis periode yang punya Dari/Sampai.
const monthPickOpen = ref(false);
const weekPickOpen = ref(false);
const yearPickOpen = ref(false);
const currentMonth = computed(() => periodOf(todayWib(), monthStartDay.value));
const shownMonth = computed(() => periodOf(period.value.anchor, monthStartDay.value));
const weekDate = ref(todayWib());
const YEARS_BACK = 11;
const years = computed(() => {
  const now = Number(todayWib().slice(0, 4));
  return Array.from({ length: YEARS_BACK + 1 }, (_, i) => now - i);
});
function openPicker() {
  const k = period.value.kind;
  if (k === 'month') monthPickOpen.value = true;
  else if (k === 'week') {
    weekDate.value = period.value.anchor;
    weekPickOpen.value = true;
  } else if (k === 'year') yearPickOpen.value = true;
  else periodOpen.value = true;
}
function pickMonth(y: number, m: number) {
  period.value = { kind: 'month', anchor: periodStartDate(y, m, monthStartDay.value) };
}
function pickWeek(date: string) {
  if (!date) return;
  period.value = { kind: 'week', anchor: date };
  weekPickOpen.value = false;
}
function pickYear(y: number) {
  period.value = { kind: 'year', anchor: `${y}-01-01` };
  yearPickOpen.value = false;
}

watch([rangeFrom, rangeTo], ([from, to]) => {
  if (period.value.kind === 'range' && from && to)
    period.value = { kind: 'range', anchor: to, from, to: to >= from ? to : from };
});

// ---------- Statistik ----------
const { query, slices, total } = useBreakdown(kind);
const income = useBreakdown(ref('income'));
const expense = useBreakdown(ref('expense'));
const percent = (v: number) => (total.value ? Math.round((v / total.value) * 100) : 0);
/** Rincian kategori; "none" = transaksi tanpa kategori */
function openCategory(id: string) {
  navigateTo({ path: `/stats/category/${id}`, query: { type: kind.value } });
}

const trend = useTrend(6);
const points = computed(() =>
  (trend.data.value ?? []).map((r) => ({
    key: `${r.year}-${r.month}`,
    label: MONTHS_SHORT[r.month - 1]!,
    income: r.income,
    expense: r.expense,
  })),
);

// ---------- Catatan ----------
const SORTS = [
  { value: 'amount', label: 'Nominal' },
  { value: 'count', label: 'Jumlah' },
  { value: 'name', label: 'Nama' },
] as const;
const noteSort = ref<(typeof SORTS)[number]['value']>('amount');
const notes = useNoteBreakdown(
  kind,
  computed(() => sub.value === 'note'),
);
const noteRows = computed(() => {
  const list = (notes.data.value ?? []).slice();
  if (noteSort.value === 'count') list.sort((a, b) => b.tx_count - a.tx_count || b.total - a.total);
  if (noteSort.value === 'name') list.sort((a, b) => a.note.localeCompare(b.note, 'id'));
  return list;
});
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-0 md:mt-0 md:overflow-hidden md:rounded-2xl"
  >
    <!-- Sama dengan bar Transaksi: ‹ periode › di tengah, tombol ikon 44px di
         kanan. Jenis periode = huruf dalam kotak (gaya ikon tab Transaksi). -->
    <NavBar title="Statistik" class="sticky top-0 md:static">
      <template #center>
        <MonthNav
          :label="headerLabel"
          :long-label="bounds.label"
          :hint="bounds.range"
          :can-next="canNext"
          unit="Periode"
          @prev="shift(-1)"
          @next="shift(1)"
          @pick="openPicker"
        />
      </template>
      <template #right>
        <IconButton
          :label="`Jenis periode: ${currentKind.label}`"
          aria-haspopup="dialog"
          @click="periodOpen = true"
        >
          <span class="kind-box gap-px pl-[5px] pr-[3px]" aria-hidden="true"
            >{{ currentKind.letter
            }}<ChevronDown class="size-2.5! shrink-0" stroke-width="3.2"
          /></span>
        </IconButton>
      </template>
      <SubTabs v-model="sub" :options="SUBS" label="Jenis statistik" />
    </NavBar>

    <MonthSwipe
      :month-key="swipeKey"
      :prev-label="neighbor(-1)"
      :next-label="neighbor(1)"
      :can-next="canNext"
      :disabled="md"
      class="min-h-[60dvh]"
      @shift="shift"
    >
      <!-- Statistik -->
      <template v-if="sub === 'stats'">
        <div
          class="flex bg-card shadow-[inset_0_-0.5px_0_var(--sep)]"
          role="group"
          aria-label="Jenis"
        >
          <button
            v-for="k in [
              { value: 'income', label: 'Pemasukan', total: income.total.value, cls: 'text-inc' },
              {
                value: 'expense',
                label: 'Pengeluaran',
                total: expense.total.value,
                cls: 'text-exp',
              },
            ] as const"
            :key="k.value"
            type="button"
            :aria-pressed="kind === k.value"
            class="relative flex flex-1 flex-col items-center gap-px pb-2 pt-[9px] text-meta font-semibold text-muted-foreground aria-pressed:after:absolute aria-pressed:after:inset-x-1/4 aria-pressed:after:bottom-0 aria-pressed:after:h-[2.5px] aria-pressed:after:rounded-sm aria-pressed:after:bg-foreground"
            @click="kind = k.value"
          >
            {{ k.label }}
            <b :class="['text-body', k.cls]">{{ formatRupiah(k.total) }}</b>
          </button>
        </div>

        <EmptyCard
          v-if="!query.isPending.value && !slices.length"
          :title="kind === 'expense' ? 'Belum ada pengeluaran' : 'Belum ada pemasukan'"
          :description="`Tidak ada transaksi di ${bounds.label}.`"
        />
        <div
          v-else
          :class="[
            'transition-opacity duration-200',
            query.isPlaceholderData.value && 'opacity-60',
          ]"
        >
          <Donut
            :slices="slices.map((s) => ({ key: s.id, value: s.value, tone: s.tone }))"
            :label="`${kind === 'expense' ? 'Pengeluaran' : 'Pemasukan'} per kategori, total ${formatRupiah(total)}`"
            :caption="kind === 'expense' ? 'Pengeluaran' : 'Pemasukan'"
            :total="formatRupiah(total)"
          />
          <div class="mx-4 mt-3 overflow-hidden rounded-group bg-card">
            <button
              v-for="s in slices"
              :key="s.id"
              type="button"
              class="slice-row flex min-h-12 w-full items-center gap-3 py-2 pl-4 pr-3.5 text-left active:bg-fill-press"
              @click="openCategory(s.id)"
            >
              <span
                class="grid h-6 min-w-11 place-items-center rounded-[7px] text-xs font-bold text-white"
                :style="{ background: `var(--tone-${IOS_TONE[s.tone]})` }"
                >{{ percent(s.value) }}%</span
              >
              <b class="min-w-0 flex-1 truncate text-row font-medium">{{ s.label }}</b>
              <span class="shrink-0 text-row font-semibold">{{ formatRupiah(s.value) }}</span>
              <ChevronRight
                class="size-[18px] shrink-0 text-chevron"
                stroke-width="2.6"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <InsightCard />

        <GroupedList
          label="6 bulan terakhir"
          :aside="`sampai ${MONTHS_SHORT[bounds.endMonth - 1]} ${bounds.endYear}`"
        >
          <div class="px-3.5 pb-3.5 pt-2">
            <TrendBars :points="points" label="Pemasukan dan pengeluaran 6 bulan terakhir" />
          </div>
        </GroupedList>
      </template>

      <!-- Budget -->
      <BudgetOverview
        v-else-if="sub === 'budget'"
        :year="bounds.endYear"
        :month="bounds.endMonth"
        :expense-total="period.kind === 'month' ? expense.total.value : null"
      />

      <!-- Catatan -->
      <template v-else>
        <div class="bg-card px-4 pb-2 pt-3">
          <Segmented
            v-model="kind"
            :options="[
              { value: 'income', label: 'Pemasukan' },
              { value: 'expense', label: 'Pengeluaran' },
            ]"
            label="Jenis"
          />
        </div>
        <div class="flex items-center gap-2 bg-card px-4 pb-3">
          <span class="text-meta text-muted-foreground">Urutkan</span>
          <Segmented v-model="noteSort" :options="SORTS" label="Urutkan" class="flex-1" />
        </div>
        <EmptyCard
          v-if="notes.error.value"
          title="Statistik catatan belum tersedia"
          :description="notes.error.value.message"
        />
        <EmptyCard
          v-else-if="!notes.isPending.value && !noteRows.length"
          title="Belum ada catatan"
          :description="`Tidak ada transaksi bercatatan di ${bounds.label}.`"
        />
        <GroupedList
          v-else
          :label="`Per catatan · ${kind === 'expense' ? 'pengeluaran' : 'pemasukan'}`"
          :aside="`${noteRows.length} catatan`"
        >
          <div
            v-for="n in noteRows"
            :key="n.note"
            class="note-row flex min-h-12 items-center gap-3 py-2 pl-4 pr-3.5"
          >
            <span class="flex min-w-0 flex-1 flex-col">
              <b class="truncate text-row font-medium">{{ n.note }}</b>
              <span class="text-meta text-muted-foreground">{{ n.tx_count }} transaksi</span>
            </span>
            <span
              :class="[
                'shrink-0 text-row font-semibold',
                kind === 'expense' ? 'text-exp' : 'text-inc',
              ]"
              >{{ formatRupiah(n.total) }}</span
            >
          </div>
        </GroupedList>
      </template>
    </MonthSwipe>

    <!-- Pilih jenis periode (mockup shPeriod) -->
    <IosSheet v-model:open="periodOpen" title="Periode statistik">
      <button
        v-for="k in KINDS"
        :key="k.value"
        type="button"
        class="flex h-[50px] w-full items-center gap-2.5 px-1 text-left text-row shadow-[inset_0_-0.5px_0_var(--sep)] last:shadow-none"
        @click="pickKind(k.value)"
      >
        <span
          :class="['kind-box', period.kind === k.value ? 'text-primary-accent' : 'text-ter']"
          aria-hidden="true"
          >{{ k.letter }}</span
        >
        <span class="flex-1">{{ k.label }}</span>
        <b v-if="period.kind === k.value" class="text-primary-accent">✓</b>
      </button>
      <div v-if="period.kind === 'range'" class="grid grid-cols-2 gap-3 pb-1 pt-3">
        <label class="flex flex-col gap-1 text-meta text-muted-foreground">
          Dari
          <input v-model="rangeFrom" type="date" class="field-input" :max="rangeTo" />
        </label>
        <label class="flex flex-col gap-1 text-meta text-muted-foreground">
          Sampai
          <input v-model="rangeTo" type="date" class="field-input" :min="rangeFrom" />
        </label>
      </div>
      <template v-if="period.kind === 'range'" #footer>
        <IosButton block @click="periodOpen = false">Selesai</IosButton>
      </template>
    </IosSheet>

    <!-- Pilih periode tertentu (ketuk judul di bar) -->
    <MonthPickerSheet
      v-model:open="monthPickOpen"
      :year="shownMonth.year"
      :month="shownMonth.month"
      :current="currentMonth"
      :max-index="currentMonth.year * 12 + currentMonth.month - 1"
      @pick="pickMonth"
    />
    <IosSheet v-model:open="weekPickOpen" title="Pilih minggu">
      <label class="flex flex-col gap-1 text-meta text-muted-foreground">
        Tanggal mana saja di minggu itu
        <input
          :value="weekDate"
          type="date"
          class="field-input"
          :max="todayWib()"
          @change="pickWeek(($event.target as HTMLInputElement).value)"
        />
      </label>
      <template #footer>
        <IosButton block variant="gray" @click="pickWeek(todayWib())"
          >Kembali ke minggu ini</IosButton
        >
      </template>
    </IosSheet>
    <IosSheet v-model:open="yearPickOpen" title="Pilih tahun">
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="y in years"
          :key="y"
          type="button"
          :aria-pressed="bounds.label === String(y)"
          :class="[
            'year-cell h-12 rounded-xl text-body font-semibold active:scale-95',
            bounds.label === String(y) ? 'bg-primary text-primary-foreground' : 'bg-fill',
          ]"
          @click="pickYear(y)"
        >
          {{ y }}
        </button>
      </div>
    </IosSheet>
  </div>
</template>

<style scoped>
/* Huruf jenis periode dalam kotak, ukuran dan garis sama dengan ikon tab
   Transaksi (kotak tanggal) supaya terbaca sebagai ikon, bukan teks */
.year-cell {
  transition: transform 140ms var(--ease-out);
}
.kind-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  border: 1.8px solid currentColor;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}
.slice-row,
.note-row {
  position: relative;
  transition: background-color 120ms ease;
}
.slice-row + .slice-row::before,
.note-row + .note-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 0;
  height: 0.5px;
  background: var(--sep);
}
</style>
