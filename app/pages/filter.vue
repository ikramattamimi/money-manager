<script setup lang="ts">
import { Check } from '@lucide/vue';
import Toaster from '@/components/base/Toaster.vue';
import IosButton from '@/components/ios/IosButton.vue';
import SectionHeader from '@/components/ios/SectionHeader.vue';
import Segmented from '@/components/ios/Segmented.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useCategories } from '@/features/categories/useCategories';
import { useTxFilter, type TxFilter, type TxFilterKind } from '@/features/transactions/useTxFilter';
import { useMonthTransactions } from '@/features/transactions/useTransactions';
import { netAmount } from '@/features/transactions/effects';
import { formatRupiah } from '@/lib/format';

// Filter Transaksi (mockup filter): modal dari ikon filter. Pilih Masuk /
// Keluar / Akun, centang kategori utama atau akun; nominal bulan terpilih di
// kanan; jumlah hasil terlihat sebelum diterapkan.
definePageMeta({ layout: false });
useHead({ title: 'Filter · Money Manager' });
if (useBreakpoint().md.value) setPageLayout('app');

const { closePage } = useFormPage();
const close = () => closePage('/');
const filter = useTxFilter();
const categories = useCategories();
const accounts = useAccounts();
const selected = useSelectedMonth();
const { data: txs } = useMonthTransactions(selected.year, selected.month);

const draft = ref<TxFilter>(
  filter.applied.value ? { ...filter.applied.value } : { kind: 'expense', off: [] },
);
const KINDS = [
  { value: 'income', label: 'Masuk' },
  { value: 'expense', label: 'Keluar' },
  { value: 'account', label: 'Akun' },
] as const;
const kind = computed({
  get: () => draft.value.kind,
  set: (k: TxFilterKind) => (draft.value = { kind: k, off: [] }),
});

const rootOf = (id: string | null) =>
  id ? (categories.byId.value.get(id)?.parent_id ?? id) : null;

/** Baris yang bisa dicentang: kategori utama (dengan sub) atau akun, plus nominalnya bulan ini */
const rows = computed(() => {
  const list = txs.value ?? [];
  const amount = new Map<string, number>();
  for (const t of list) {
    if (t.is_adjustment) continue;
    if (draft.value.kind === 'account') {
      if (t.type === 'transfer') continue;
      amount.set(t.account_id, (amount.get(t.account_id) ?? 0) + netAmount(t));
    } else if (t.type === draft.value.kind) {
      const root = rootOf(t.category_id) ?? 'none';
      amount.set(root, (amount.get(root) ?? 0) + netAmount(t));
    }
  }
  if (draft.value.kind === 'account')
    return accounts.active.value.map((a) => ({
      id: a.id,
      label: a.name,
      subs: '',
      amount: amount.get(a.id),
    }));
  const all = categories.data.value ?? [];
  return [
    ...all
      .filter((c) => c.kind === draft.value.kind && !c.parent_id)
      .map((c) => ({
        id: c.id,
        label: c.name,
        subs: all
          .filter((s) => s.parent_id === c.id)
          .map((s) => s.name)
          .join(', '),
        amount: amount.get(c.id),
      })),
    // Transaksi tanpa kategori (mis. hasil impor) juga bisa dikeluarkan
    { id: 'none', label: 'Tanpa kategori', subs: '', amount: amount.get('none') },
  ];
});

const isOn = (id: string) => !draft.value.off.includes(id);
function toggle(id: string) {
  const off = draft.value.off;
  draft.value = { ...draft.value, off: isOn(id) ? [...off, id] : off.filter((x) => x !== id) };
}
const allOn = computed(() => rows.value.every((r) => isOn(r.id)));
function toggleAll() {
  draft.value = { ...draft.value, off: allOn.value ? rows.value.map((r) => r.id) : [] };
}

const count = computed(() => filter.apply(txs.value ?? [], rootOf, draft.value).length);

function reset() {
  filter.applied.value = null;
  close();
}
function applyFilter() {
  filter.applied.value = { ...draft.value };
  close();
}
</script>

<template>
  <div data-page-stage class="flex min-h-dvh flex-col bg-background">
    <header
      class="sticky top-0 z-30 bg-card pt-[env(safe-area-inset-top,0px)] shadow-[0_0.5px_0_var(--sep)]"
    >
      <div class="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-1">
        <button
          type="button"
          class="h-11 justify-self-start px-3 text-bar text-primary-accent active:opacity-50"
          @click="close"
        >
          Batal
        </button>
        <h1 class="m-0 text-bar font-semibold tracking-[-0.02em]">Filter</h1>
        <button
          type="button"
          class="h-11 justify-self-end px-3 text-bar text-primary-accent active:opacity-50"
          @click="reset"
        >
          Reset
        </button>
      </div>
      <div class="flex items-center gap-2 px-4 pb-2.5">
        <span
          class="inline-flex h-[30px] items-center rounded-full bg-fill px-2.5 text-label font-semibold"
          >{{ selected.longLabel.value }}</span
        >
        <Segmented v-model="kind" :options="KINDS" label="Jenis filter" class="ml-auto w-[210px]" />
      </div>
    </header>

    <main class="mx-auto w-full max-w-[640px] flex-1 pb-[120px]">
      <SectionHeader
        :label="
          kind === 'account'
            ? 'Akun'
            : `Kategori ${kind === 'income' ? 'pemasukan' : 'pengeluaran'}`
        "
      >
        <template #aside>
          <button type="button" class="normal-case text-primary-accent" @click="toggleAll">
            {{ allOn ? 'Kosongkan' : 'Pilih semua' }}
          </button>
        </template>
      </SectionHeader>
      <div class="mx-4 overflow-hidden rounded-group bg-card">
        <button
          v-for="r in rows"
          :key="r.id"
          type="button"
          :aria-pressed="isOn(r.id)"
          class="filter-row flex min-h-12 w-full items-center gap-3 py-2 pl-4 pr-3.5 text-left active:bg-fill-press"
          @click="toggle(r.id)"
        >
          <span
            :class="[
              'grid size-6 shrink-0 place-items-center rounded-full border-[1.6px]',
              isOn(r.id)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-chevron text-transparent',
            ]"
            aria-hidden="true"
          >
            <Check class="size-[13px]" stroke-width="3.4" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <b class="truncate text-row font-semibold">{{ r.label }}</b>
            <span v-if="r.subs" class="truncate text-meta text-muted-foreground">{{ r.subs }}</span>
          </span>
          <span class="shrink-0 text-row text-muted-foreground">{{
            r.amount ? formatRupiah(r.amount) : '–'
          }}</span>
        </button>
      </div>
    </main>

    <div
      class="filter-bar fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-3"
    >
      <IosButton block class="mx-auto max-w-[608px]" @click="applyFilter"
        >Tampilkan {{ count }} transaksi</IosButton
      >
    </div>
    <Toaster />
  </div>
</template>

<style scoped>
.filter-row {
  position: relative;
  transition: background-color 120ms ease;
}
.filter-row + .filter-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 52px;
  right: 0;
  height: 0.5px;
  background: var(--sep);
}
.filter-bar {
  background: var(--glass-menu);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  box-shadow: 0 -0.5px 0 var(--glass-menu-line);
}
@media (prefers-reduced-transparency: reduce) {
  .filter-bar {
    background: var(--glass-menu-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
