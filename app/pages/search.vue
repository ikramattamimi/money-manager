<script setup lang="ts">
import { Search, SlidersHorizontal, X } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import FormField from '@/components/base/FormField.vue';
import Toaster from '@/components/base/Toaster.vue';
import GridPicker from '@/components/data/GridPicker.vue';
import Chip from '@/components/ios/Chip.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import IosButton from '@/components/ios/IosButton.vue';
import Segmented from '@/components/ios/Segmented.vue';
import DayGroup from '@/components/money/DayGroup.vue';
import TxRow from '@/components/money/TxRow.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useCategories } from '@/features/categories/useCategories';
import type { SearchFilters } from '@/features/search/api';
import { PAGE_SIZE } from '@/features/search/api';
import { EMPTY_FILTERS, hasFilter, useSearch } from '@/features/search/useSearch';
import { groupByDay } from '@/features/transactions/grouping';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import { useTxDisplay } from '@/features/transactions/useTxDisplay';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { fromLocalInput } from '@/lib/time';

// Cari transaksi di catatan dan keterangan, dengan filter jenis, akun,
// kategori, tanggal, dan nominal. Total dihitung dari semua hasil (RPC).
// Modal dari ikon kaca pembesar di Transaksi (mockup search): naik dari bawah,
// Batal di kanan, kolom cari dan chip filter di bar atas.
definePageMeta({ layout: false });
useHead({ title: 'Cari · Money Manager' });
// iPad/desktop: tetap di dalam kerangka app (sidebar, dialog ubah transaksi)
if (useBreakpoint().md.value) setPageLayout('app');

const filters = useState<SearchFilters>('search:filters', () => ({ ...EMPTY_FILTERS }));
const page = ref(0);
watch(filters, () => (page.value = 0), { deep: true });
const results = useSearch(filters, page);

const accounts = useAccounts();
const categories = useCategories();
const pickerItems = usePickerItems();
const { rowView } = useTxDisplay();
const editor = useTxEditor();
const { closePage } = useFormPage();
const close = () => closePage('/');

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

// ---------- hasil ----------
const days = computed(() => groupByDay(results.data.value?.rows ?? []));
const pages = computed(() => Math.ceil((results.data.value?.count ?? 0) / PAGE_SIZE));
</script>

<template>
  <div data-page-stage class="flex min-h-dvh flex-col bg-background">
    <header
      class="sticky top-0 z-30 bg-card pt-[env(safe-area-inset-top,0px)] shadow-[0_0.5px_0_var(--sep)]"
    >
      <div class="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-1">
        <span />
        <h1 class="m-0 text-bar font-semibold tracking-[-0.02em]">Cari</h1>
        <button
          type="button"
          class="h-11 justify-self-end px-3 text-bar text-primary-accent active:opacity-50"
          @click="close"
        >
          Batal
        </button>
      </div>
      <label
        class="mx-4 mb-2.5 flex h-[38px] items-center gap-[7px] rounded-[11px] bg-fill px-2.5 text-muted-foreground"
      >
        <Search class="size-[18px] shrink-0" stroke-width="2.2" aria-hidden="true" />
        <input
          ref="input"
          v-model="filters.query"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          placeholder="Catatan atau keterangan"
          aria-label="Cari catatan atau keterangan"
          class="min-w-0 flex-1 bg-transparent text-amount text-foreground outline-none placeholder:text-ter"
        />
      </label>
      <div class="flex gap-1.5 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none]">
        <Chip :on="showFilters" @click="showFilters = !showFilters">
          <SlidersHorizontal class="size-3.5" aria-hidden="true" />Filter
        </Chip>
        <Chip v-for="c in chips" :key="c.key" on @click="clearChip(c.key)">
          {{ c.label }}<X class="size-3.5" :aria-label="`Hapus filter ${c.label}`" />
        </Chip>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[720px] flex-1 pb-10">
      <!-- Filter lengkap -->
      <div v-if="showFilters" class="mx-4 mt-3.5 flex flex-col gap-3.5 rounded-group bg-card p-4">
        <Segmented v-model="type" :options="TYPES" label="Jenis transaksi" />
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
      </div>

      <!-- Hasil -->
      <EmptyCard
        v-if="!hasFilter(filters)"
        title="Cari di semua transaksi"
        description="Ketik catatan, atau pakai Filter untuk akun, kategori, tanggal, dan nominal."
      />
      <EmptyCard v-else-if="results.isPending.value" title="Mencari…" />
      <EmptyCard
        v-else-if="!results.data.value?.count"
        title="Tidak ditemukan"
        description="Coba kata lain atau longgarkan filternya."
      />
      <template v-else>
        <div
          :class="[
            'flex items-baseline justify-between gap-3 px-8 pb-[7px] pt-[18px] text-meta uppercase tracking-[0.02em] text-muted-foreground transition-opacity duration-200',
            results.isPlaceholderData.value && 'opacity-60',
          ]"
          aria-live="polite"
        >
          <span>{{ results.data.value.count.toLocaleString('id-ID') }} transaksi</span>
          <span class="normal-case">
            <span v-if="results.data.value.income" class="text-inc">{{
              formatRupiah(results.data.value.income)
            }}</span>
            <span v-if="results.data.value.expense" class="ml-2 text-exp">{{
              formatRupiah(results.data.value.expense)
            }}</span>
          </span>
        </div>
        <DayGroup
          v-for="d in days"
          :key="d.key"
          :day-key="d.key"
          :income="d.income"
          :expense="d.expense"
        >
          <TxRow
            v-for="t in d.items"
            :id="t.id"
            :key="t.id"
            v-bind="rowView(t)"
            :selectable="false"
            @open="editor.edit(t)"
          />
        </DayGroup>
        <div v-if="pages > 1" class="mt-4 flex items-center justify-center gap-2 px-4 text-meta">
          <IosButton variant="gray" class="flex-1" :disabled="page === 0" @click="page--"
            >Sebelumnya</IosButton
          >
          <span class="text-muted-foreground">{{ page + 1 }} / {{ pages }}</span>
          <IosButton variant="gray" class="flex-1" :disabled="page + 1 >= pages" @click="page++"
            >Berikutnya</IosButton
          >
        </div>
      </template>
    </main>
    <Toaster />
  </div>
</template>
