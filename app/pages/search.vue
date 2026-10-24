<script setup lang="ts">
import { ArrowLeft, Search, SearchX, SlidersHorizontal, X } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import Card from '@/components/base/Card.vue';
import FormField from '@/components/base/FormField.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import GridPicker from '@/components/data/GridPicker.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import TransactionRow from '@/components/money/TransactionRow.vue';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useCategories } from '@/features/categories/useCategories';
import type { SearchFilters } from '@/features/search/api';
import { PAGE_SIZE } from '@/features/search/api';
import { EMPTY_FILTERS, hasFilter, useSearch } from '@/features/search/useSearch';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { dayKey, dayLabel, fromLocalInput } from '@/lib/time';

// Cari transaksi di catatan dan keterangan, dengan filter jenis, akun,
// kategori, tanggal, dan nominal. Total dihitung dari semua hasil (RPC).
definePageMeta({ layout: 'app' });
useHead({ title: 'Cari · Money Manager' });

const filters = useState<SearchFilters>('search:filters', () => ({ ...EMPTY_FILTERS }));
const page = ref(0);
watch(filters, () => (page.value = 0), { deep: true });
const results = useSearch(filters, page);

const accounts = useAccounts();
const categories = useCategories();
const pickerItems = usePickerItems();
const { rowProps } = useTxDisplay();
const editor = useTxEditor();

const input = ref<HTMLInputElement>();
onMounted(() => input.value?.focus({ preventScroll: true }));

// ---------- filter ----------
const showFilters = ref(false);
const TYPES = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Keluar' },
  { value: 'income', label: 'Masuk' },
  { value: 'transfer', label: 'Transfer' },
] as const;
const type = computed({
  get: () => filters.value.type ?? 'all',
  set: (v: (typeof TYPES)[number]['value']) => (filters.value.type = v === 'all' ? null : v),
});

type Picker = 'account' | 'category';
const picker = ref<Picker | null>(null);
const pickerList = computed(() =>
  picker.value === 'account'
    ? pickerItems.accountItems()
    : [
        ...pickerItems.categoryItems('expense').filter((i) => i.id !== ''),
        ...pickerItems.categoryItems('income').filter((i) => i.id !== ''),
      ],
);
function choose(id: string) {
  if (picker.value === 'account') filters.value.accountId = id;
  else filters.value.categoryId = id;
  picker.value = null;
}

// Tanggal dalam kalender WIB; "sampai" inklusif
const dateFrom = ref('');
const dateTo = ref('');
watch([dateFrom, dateTo], ([from, to]) => {
  filters.value.from = from ? fromLocalInput(`${from}T00:00`) : null;
  if (to) {
    const end = new Date(fromLocalInput(`${to}T00:00`));
    end.setUTCDate(end.getUTCDate() + 1);
    filters.value.to = end.toISOString();
  } else filters.value.to = null;
});
const min = computed({
  get: () => filters.value.min ?? 0,
  set: (v: number) => (filters.value.min = v || null),
});
const max = computed({
  get: () => filters.value.max ?? 0,
  set: (v: number) => (filters.value.max = v || null),
});

/** Chip ringkas untuk filter yang aktif, masing-masing bisa dihapus */
const chips = computed(() => {
  const f = filters.value;
  const out: { key: keyof SearchFilters | 'date'; label: string }[] = [];
  if (f.type) out.push({ key: 'type', label: TYPES.find((t) => t.value === f.type)!.label });
  if (f.accountId) out.push({ key: 'accountId', label: accounts.name(f.accountId) });
  if (f.categoryId) out.push({ key: 'categoryId', label: categories.label(f.categoryId, true) });
  if (f.from || f.to)
    out.push({ key: 'date', label: `${dateFrom.value || '…'} – ${dateTo.value || '…'}` });
  if (f.min) out.push({ key: 'min', label: `≥ ${formatRupiah(f.min)}` });
  if (f.max) out.push({ key: 'max', label: `≤ ${formatRupiah(f.max)}` });
  return out;
});
function clearChip(key: keyof SearchFilters | 'date') {
  if (key === 'date') {
    dateFrom.value = '';
    dateTo.value = '';
  } else if (key !== 'query') filters.value = { ...filters.value, [key]: null };
}
function clearAll() {
  filters.value = { ...EMPTY_FILTERS };
  dateFrom.value = '';
  dateTo.value = '';
}

// ---------- hasil ----------
const days = computed(() => {
  const groups = new Map<string, NonNullable<typeof results.data.value>['rows']>();
  for (const t of results.data.value?.rows ?? []) {
    const key = dayKey(t.occurred_at);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
});
const pages = computed(() => Math.ceil((results.data.value?.count ?? 0) / PAGE_SIZE));
</script>

<template>
  <div class="mx-auto md:max-w-[720px]">
    <PageHeader title="Cari transaksi">
      <template #actions>
        <HeaderButton label="Kembali ke Transaksi" @click="navigateTo('/')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <HeaderButton :aria-pressed="showFilters" @click="showFilters = !showFilters">
          <SlidersHorizontal aria-hidden="true" />Filter
        </HeaderButton>
      </template>
      <div class="relative">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref="input"
          v-model="filters.query"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          placeholder="Cari catatan, mis. shopee"
          aria-label="Cari catatan atau keterangan"
          class="field-input pl-9"
        />
      </div>
    </PageHeader>

    <!-- Filter -->
    <Card v-if="showFilters" class="mt-3.5 flex flex-col gap-3.5 p-3.5">
      <SegmentedControl v-model="type" :options="TYPES" label="Jenis transaksi" />
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Akun" for="f-account">
          <button
            id="f-account"
            type="button"
            class="field-input flex items-center text-left"
            @click="picker = picker === 'account' ? null : 'account'"
          >
            <span :class="['truncate', !filters.accountId && 'text-faint']">{{
              accounts.name(filters.accountId) || 'Semua akun'
            }}</span>
          </button>
        </FormField>
        <FormField label="Kategori" for="f-category">
          <button
            id="f-category"
            type="button"
            class="field-input flex items-center text-left"
            @click="picker = picker === 'category' ? null : 'category'"
          >
            <span :class="['truncate', !filters.categoryId && 'text-faint']">{{
              filters.categoryId ? categories.label(filters.categoryId, true) : 'Semua kategori'
            }}</span>
          </button>
        </FormField>
      </div>
      <section
        v-if="picker"
        class="overflow-hidden rounded-xl border"
        :aria-label="picker === 'account' ? 'Pilih akun' : 'Pilih kategori'"
      >
        <div class="max-h-[46dvh] overflow-y-auto overscroll-contain">
          <GridPicker
            :key="picker"
            :items="pickerList"
            :model-value="(picker === 'account' ? filters.accountId : filters.categoryId) ?? ''"
            :label="picker === 'account' ? 'Akun' : 'Kategori'"
            @select="choose"
          />
        </div>
      </section>
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Dari tanggal" for="f-from">
          <input
            id="f-from"
            v-model="dateFrom"
            type="date"
            :max="dateTo || undefined"
            class="field-input"
          />
        </FormField>
        <FormField label="Sampai tanggal" for="f-to">
          <input
            id="f-to"
            v-model="dateTo"
            type="date"
            :min="dateFrom || undefined"
            class="field-input"
          />
        </FormField>
        <FormField label="Nominal minimal" for="f-min">
          <AmountInput id="f-min" v-model="min" placeholder="Bebas" />
        </FormField>
        <FormField label="Nominal maksimal" for="f-max">
          <AmountInput id="f-max" v-model="max" placeholder="Bebas" />
        </FormField>
      </div>
    </Card>

    <div v-if="chips.length" class="mt-3 flex flex-wrap gap-1.5">
      <button
        v-for="c in chips"
        :key="c.key"
        type="button"
        class="press inline-flex h-8 items-center gap-1.5 rounded-full border bg-card pl-3 pr-2 text-meta font-semibold"
        :aria-label="`Hapus filter ${c.label}`"
        @click="clearChip(c.key)"
      >
        {{ c.label }}<X class="size-3.5 text-muted-foreground" aria-hidden="true" />
      </button>
      <Button variant="ghost" size="default" @click="clearAll">Hapus semua</Button>
    </div>

    <!-- Hasil -->
    <Card v-if="!hasFilter(filters)" class="mt-3.5">
      <EmptyState
        :icon="Search"
        title="Cari di semua transaksi"
        description="Ketik catatan, atau pakai Filter untuk akun, kategori, tanggal, dan nominal."
      />
    </Card>
    <Card v-else-if="results.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="5" /></Card>
    <Card v-else-if="!results.data.value?.count" class="mt-3.5">
      <EmptyState
        :icon="SearchX"
        title="Tidak ditemukan"
        description="Coba kata lain atau longgarkan filternya."
      />
    </Card>
    <template v-else>
      <div
        :class="[
          'mt-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-2.5 text-meta transition-opacity duration-200',
          results.isPlaceholderData.value && 'opacity-60',
        ]"
        aria-live="polite"
      >
        <b class="tabular-nums">{{ results.data.value.count.toLocaleString('id-ID') }} transaksi</b>
        <span v-if="results.data.value.expense" class="tabular-nums text-bad"
          >Keluar {{ formatRupiah(results.data.value.expense) }}</span
        >
        <span v-if="results.data.value.income" class="tabular-nums text-primary-accent"
          >Masuk {{ formatRupiah(results.data.value.income) }}</span
        >
      </div>
      <ListGroup v-for="d in days" :key="d.key" :label="dayLabel(d.items[0]!.occurred_at)">
        <TransactionRow
          v-for="t in d.items"
          :key="t.id"
          v-bind="rowProps(t)"
          @select="editor.edit(t)"
        />
      </ListGroup>
      <div v-if="pages > 1" class="mt-4 flex items-center justify-center gap-2 text-meta">
        <Button variant="secondary" size="default" :disabled="page === 0" @click="page--"
          >Sebelumnya</Button
        >
        <span class="tabular-nums text-muted-foreground">{{ page + 1 }} / {{ pages }}</span>
        <Button variant="secondary" size="default" :disabled="page + 1 >= pages" @click="page++"
          >Berikutnya</Button
        >
      </div>
    </template>
  </div>
</template>
