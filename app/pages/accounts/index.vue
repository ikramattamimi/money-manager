<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import {
  Archive,
  ArrowDownUp,
  BookOpen,
  ChevronRight,
  Ellipsis,
  Eye,
  EyeOff,
  FolderCog,
  FolderInput,
  FolderPlus,
  ListChecks,
  Plus,
  Sigma,
  Wallet,
} from '@lucide/vue';
import Overlay from '@/components/base/Overlay.vue';
import SortableList from '@/components/data/SortableList.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import MonthSwipe from '@/components/ios/MonthSwipe.vue';
import NavBar from '@/components/ios/NavBar.vue';
import SectionHeader from '@/components/ios/SectionHeader.vue';
import SummaryStrip from '@/components/ios/SummaryStrip.vue';
import AccountForm from '@/components/money/AccountForm.vue';
import AccountGroupForm from '@/components/money/AccountGroupForm.vue';
import AccountRow from '@/components/money/AccountRow.vue';
import AccountTotalForm from '@/components/money/AccountTotalForm.vue';
import NetWorthSpark from '@/components/money/NetWorthSpark.vue';
import TotalCard from '@/components/money/TotalCard.vue';
import { accountsApi, type Account, type AccountTotal } from '@/features/accounts/api';
import { accountKeys } from '@/features/accounts/keys';
import { groupStyle } from '@/features/accounts/style';
import { useAccountMonths, useAccountYear } from '@/features/accounts/useAccountMonth';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useMonthTransactions } from '@/features/transactions/useTransactions';
import { formatRupiah, formatShort } from '@/lib/format';
import { MONTHS_LONG, MONTHS_SHORT } from '@/lib/time';

// Tab Akun (mockup accounts): bar "Akun" dengan … (menu: Total akun, grup,
// pilih banyak, urutkan, buku) dan +; strip Aset / Liabilitas / Total; kartu
// total akun mendatar; tren aset bersih per tahun (digeser, bulan bisa diketuk); grup akun yang bisa dilipat
// dengan total per grup. Saldo = saldo per akhir bulan terpilih (bulan sama
// dengan tab Transaksi). Tahan baris = pilih banyak (pindah grup, arsipkan,
// atur total, dengan Urungkan). iPad/desktop: grup 2 kolom, form di dialog.
definePageMeta({ layout: 'app' });
useHead({ title: 'Akun · Money Manager' });

const { canEdit, book } = useActiveBook();
const { accounts, grouped, groups, active, totalViews, totalById } = useAccounts();
const hasTotals = computed(() => totalViews.value.length > 0);
const mutations = useAccountMutations();

// ---------- saldo per akhir bulan terpilih ----------
const selectedMonth = useSelectedMonth();
// Ketuk ulang tab Akun (seperti Transaksi) = kembali ke bulan ini
const retap = useState('nav:retap:accounts', () => 0);
watch(retap, () => selectedMonth.goToday());
const { year, month } = selectedMonth;
const monthly = useAccountMonths(year, month);
/** Saldo akhir bulan; tanpa RPC (belum dipasang) = saldo sekarang */
const balanceOf = (a: Account) => monthly.selected(a.id)?.end ?? a.balance;
const monthName = computed(() => `${MONTHS_LONG[month.value - 1]} ${year.value}`);
// Geser daftar = ganti bulan, sama dengan tab Transaksi
const { md } = useBreakpoint();
const swipeKey = computed(() => `${year.value}-${String(month.value).padStart(2, '0')}`);

// Jumlah transaksi per akun di bulan itu (daftar bulan sudah termuat bersama tab Transaksi)
const monthTx = useMonthTransactions(year, month);
const txCount = computed(() => {
  const out = new Map<string, number>();
  for (const t of monthTx.data.value ?? []) {
    out.set(t.account_id, (out.get(t.account_id) ?? 0) + 1);
    if (t.to_account_id) out.set(t.to_account_id, (out.get(t.to_account_id) ?? 0) + 1);
  }
  return out;
});

/** Aset, liabilitas, total dari akun yang ikut total (aturan sama dengan useAccounts) */
const strip = computed(() => {
  let assets = 0;
  let debts = 0;
  for (const a of active.value) {
    if (!a.include_in_total) continue;
    const b = balanceOf(a);
    if (b >= 0) assets += b;
    else debts -= b;
  }
  return [
    { label: 'Aset', value: formatRupiah(assets), tone: 'inc' as const },
    { label: 'Liabilitas', value: formatRupiah(debts), tone: 'exp' as const },
    { label: 'Total', value: formatRupiah(assets - debts) },
  ];
});

const views = computed(() =>
  grouped.value.map((g) => {
    const items = g.accounts.map((a) => ({ account: a, balance: balanceOf(a) }));
    return {
      ...g,
      style: groupStyle(g),
      items,
      total: items.reduce((s, i) => s + i.balance, 0),
    };
  }),
);
const totalCards = computed(() =>
  totalViews.value.map((t) => ({
    ...t,
    value: t.accounts.reduce((s, a) => s + balanceOf(a), 0),
  })),
);

// ---------- tren aset bersih ----------
// Chart digeser per tahun: tahun berjalan hanya sampai bulan ini, tahun lain
// penuh Jan–Des. Tahun yang tampil mengikuti bulan terpilih bila berpindah
// tahun lewat panah/geser halaman.
const { current } = selectedMonth;
const MAX_YEARS_BACK = 11;
const viewYear = ref(year.value);
watch(year, (y) => (viewYear.value = y));
const viewEnd = computed(() => (viewYear.value >= current.value.year ? current.value.month : 12));
const yearData = useAccountYear(viewYear, viewEnd);
const canPrevYear = computed(() => viewYear.value > current.value.year - MAX_YEARS_BACK);
const canNextYear = computed(() => viewYear.value < current.value.year);
function shiftYear(delta: 1 | -1) {
  viewYear.value += delta;
}
function pickTrendMonth(key: string) {
  const [y, m] = key.split('-').map(Number) as [number, number];
  selectedMonth.set(y, m);
}
const trend = computed(() => {
  const byAccount = yearData.byAccount.value;
  if (!byAccount) return [];
  return yearData.months.value.map((m, k) => ({
    key: `${m.year}-${m.month}`,
    label: MONTHS_SHORT[m.month - 1]!,
    value: active.value
      .filter((a) => a.include_in_total)
      .reduce((s, a) => s + (byAccount.get(a.id)?.[k]?.end ?? 0), 0),
  }));
});

// ---------- grup dilipat (bertahan saat pindah tab) ----------
const collapsed = useState<string[]>('acc:collapsed', () => []);
function toggleGroup(id: string) {
  collapsed.value = collapsed.value.includes(id)
    ? collapsed.value.filter((x) => x !== id)
    : [...collapsed.value, id];
}

const subtitleOf = (a: Account) => {
  const count = txCount.value.get(a.id) ?? 0;
  return [`${count} transaksi di ${MONTHS_SHORT[month.value - 1]}`, totalLabel(a)]
    .filter(Boolean)
    .join(' · ');
};
/** Nama total hanya perlu ditulis kalau ada lebih dari satu total */
const totalLabel = (a: Account) => {
  const total = a.total_id ? totalById.value.get(a.total_id) : undefined;
  if (!total && !a.include_in_total) return 'tidak ikut total';
  if (!total) return hasTotals.value ? 'tidak ikut total' : '';
  return totalViews.value.length > 1 ? total.name : '';
};

const sorting = ref(false);
const archived = computed(() => (accounts.data.value ?? []).filter((a) => a.archived));
const showArchived = ref(false);

// ---------- pilih banyak: pindah grup, ikut total, arsipkan ----------
const client = useQueryClient();
const toast = useToast();
const selecting = ref(false);
const selected = ref<string[]>([]);
const visible = computed(() => grouped.value.flatMap((g) => g.accounts));
const chosen = computed(() => visible.value.filter((a) => selected.value.includes(a.id)));
function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id];
}
function toggleAll() {
  selected.value =
    selected.value.length === visible.value.length ? [] : visible.value.map((a) => a.id);
}
function startSelect(a?: Account) {
  if (!canEdit.value) return;
  sorting.value = false;
  selecting.value = true;
  if (a && !selected.value.includes(a.id)) selected.value = [...selected.value, a.id];
}
function stopSelecting() {
  selecting.value = false;
  selected.value = [];
}
watch(sorting, (on) => on && stopSelecting());
// Tombol + disembunyikan selama memilih: bilah aksi ada di tempat yang sama
const hideAdd = useState('ui:selecting', () => false);
watch(selecting, (on) => (hideAdd.value = on));
onBeforeUnmount(() => (hideAdd.value = false));

function tapRow(a: Account) {
  if (selecting.value) toggle(a.id);
  else navigateTo(`/accounts/${a.id}`);
}

const bulkBusy = ref(false);
const BULK_BTN =
  'flex h-[54px] flex-col items-center justify-center gap-0.5 rounded-[14px] bg-fill text-xs font-semibold text-primary-accent transition-transform duration-150 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5';
type Field = 'group_id' | 'include_in_total' | 'archived' | 'total_id';
/** Total akun: ikut total aset = masuk salah satu total */
const patchFor = <F extends Field>(field: F, value: Account[F]) =>
  field === 'total_id'
    ? { total_id: value as string | null, include_in_total: value !== null }
    : { [field]: value };
/** Ubah satu kolom untuk semua akun terpilih, dengan Urungkan ke nilai lama */
async function bulkSet<F extends Field>(field: F, value: Account[F], message: string) {
  const list = chosen.value;
  if (!list.length) return;
  bulkBusy.value = true;
  try {
    await accountsApi.updateMany(
      list.map((a) => a.id),
      patchFor(field, value),
    );
    await client.invalidateQueries({ queryKey: accountKeys.all });
    stopSelecting();
    const before = new Map<Account[F], string[]>();
    for (const a of list) before.set(a[field], [...(before.get(a[field]) ?? []), a.id]);
    toast.show(`${list.length} akun ${message}`, () =>
      Promise.all([...before].map(([v, ids]) => accountsApi.updateMany(ids, patchFor(field, v))))
        .then(() => client.invalidateQueries({ queryKey: accountKeys.all }))
        .catch((e: Error) => toast.show(e.message)),
    );
  } catch (e) {
    toast.show((e as Error).message);
  } finally {
    bulkBusy.value = false;
  }
}
const groupPicker = ref(false);
const creatingGroup = ref(false);
watch(groupPicker, (open) => open || (creatingGroup.value = false));
function moveTo(groupId: string, name: string) {
  groupPicker.value = false;
  bulkSet('group_id', groupId, `dipindah ke ${name}`);
}

// Total akun: pilih total (atau buat baru) untuk akun terpilih
const totalPicker = ref(false);
const creatingTotal = ref(false);
watch(totalPicker, (open) => open || (creatingTotal.value = false));
function setTotal(totalId: string | null, name: string) {
  totalPicker.value = false;
  bulkSet('total_id', totalId, totalId ? `masuk ${name}` : 'tidak ikut total');
}

// ---------- urutkan grup (mode Urutkan) ----------
/**
 * Hanya grup berisi akun yang tampil; grup kosong tetap di posisinya di antara
 * mereka, jadi urutan baru diselipkan ke urutan semua grup.
 */
function reorderGroups(ids: string[]) {
  const shown = new Set(ids);
  const next = [...ids];
  const all = (groups.data.value ?? []).map((g) => (shown.has(g.id) ? next.shift()! : g.id));
  mutations.reorderGroups.mutate(all);
}

// ---------- menu … ----------
const menuOpen = ref(false);
function fromMenu(action: () => void) {
  menuOpen.value = false;
  action();
}

// ---------- form (HP: halaman, iPad/desktop: dialog) ----------
const { openAsPage } = useFormPage();
const formOpen = ref(false);
const editing = ref<Account | null>(null);
const formKey = ref(0);
function openForm(account: Account | null) {
  if (openAsPage(account ? `/accounts/${account.id}/edit` : '/accounts/new')) return;
  editing.value = account;
  formKey.value++;
  formOpen.value = true;
}
const totalFormOpen = ref(false);
const editingTotal = ref<AccountTotal | null>(null);
function openTotal(total: AccountTotal | null) {
  // Viewer tidak bisa mengubah: cukup lihat daftar total
  if (!canEdit.value) return navigateTo('/accounts/totals');
  if (openAsPage(total ? `/accounts/totals/${total.id}` : '/accounts/totals/new')) return;
  editingTotal.value = total;
  formKey.value++;
  totalFormOpen.value = true;
}
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] pb-6 md:mx-0 md:mt-0 md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Akun" line class="sticky top-0 md:static">
      <template #left>
        <button
          v-if="selecting"
          type="button"
          class="h-11 px-3 text-bar text-primary-accent active:opacity-50"
          @click="toggleAll"
        >
          {{ selected.length === visible.length ? 'Batal pilih' : 'Pilih semua' }}
        </button>
        <NuxtLink
          v-else
          to="/settings/books"
          :aria-label="`Buku ${book?.name ?? ''}, ganti buku`"
          class="flex h-11 max-w-[120px] items-center gap-1 px-3 text-label text-primary-accent active:opacity-50"
        >
          <BookOpen class="size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ book?.name }}</span>
        </NuxtLink>
      </template>
      <template #right>
        <button
          v-if="selecting || sorting"
          type="button"
          class="h-11 px-3 text-bar font-semibold text-primary-accent active:opacity-50"
          @click="selecting ? stopSelecting() : (sorting = false)"
        >
          Selesai
        </button>
        <template v-else>
          <IconButton label="Menu akun" @click="menuOpen = true">
            <Ellipsis aria-hidden="true" />
          </IconButton>
          <IconButton v-if="canEdit" label="Tambah akun" accent @click="openForm(null)">
            <Plus stroke-width="2.2" aria-hidden="true" />
          </IconButton>
        </template>
      </template>
    </NavBar>

    <SummaryStrip :items="strip" dense />

    <!-- Bulan terpilih (sama dengan Transaksi dan Statistik): saldo yang tampil adalah saldo akhir bulan itu -->
    <div
      :class="[
        'flex items-center gap-2 px-4 py-2 text-note',
        selectedMonth.isCurrent.value
          ? 'bg-card text-muted-foreground shadow-[inset_0_-0.5px_0_var(--sep)]'
          : 'bg-primary-soft text-primary-accent',
      ]"
    >
      <span class="flex-1">
        {{
          monthly.available.value
            ? `Saldo per akhir ${monthName} · geser untuk ganti bulan`
            : `Saldo sekarang (saldo ${monthName} belum tersedia)`
        }}
      </span>
      <button
        v-if="!selectedMonth.isCurrent.value"
        type="button"
        class="font-semibold"
        @click="selectedMonth.goToday()"
      >
        Bulan ini
      </button>
    </div>

    <!-- Mode Urutkan: urutan grup dulu, lalu urutan akun di dalam tiap grup -->
    <template v-if="sorting">
      <template v-if="views.length > 1">
        <SectionHeader label="Urutan grup" />
        <div class="mx-4 overflow-hidden rounded-group bg-card">
          <SortableList :items="views" label="Urutan grup akun" @reorder="reorderGroups">
            <template #default="{ item }">
              <GroupRow :title="item.name" :subtitle="`${item.accounts.length} akun`">
                <template #icon><ToneIcon v-bind="item.style" size="sm" solid /></template>
              </GroupRow>
            </template>
          </SortableList>
        </div>
      </template>
      <div class="md:columns-2 md:gap-0 [&>section]:break-inside-avoid">
        <section v-for="g in views" :key="g.id">
          <SectionHeader :label="`Urutan ${g.name}`" />
          <div class="mx-4 overflow-hidden rounded-group bg-card">
            <SortableList
              :items="g.accounts"
              :label="`Urutan akun ${g.name}`"
              @reorder="mutations.reorder.mutate"
            >
              <template #default="{ item }">
                <GroupRow :title="item.name" :subtitle="formatRupiah(balanceOf(item))">
                  <template #icon><ToneIcon v-bind="g.style" size="sm" solid /></template>
                </GroupRow>
              </template>
            </SortableList>
          </div>
        </section>
      </div>
      <p class="m-0 px-8 pt-2 text-note text-muted-foreground">
        Seret pegangan di kanan untuk mengubah urutan.
      </p>
    </template>

    <MonthSwipe
      v-else
      :month-key="swipeKey"
      :prev-label="selectedMonth.neighborLabel(-1)"
      :next-label="selectedMonth.neighborLabel(1)"
      :can-next="selectedMonth.canNext.value"
      :disabled="md || selecting"
      class="min-h-[60dvh]"
      @shift="selectedMonth.shift"
    >
      <!-- Total akun: kartu mendatar, yang tampil di Transaksi disorot -->
      <SectionHeader v-if="totalCards.length || canEdit" label="Total akun">
        <template #aside>
          <NuxtLink to="/accounts/totals" class="normal-case text-primary-accent active:opacity-50">
            Kelola ›
          </NuxtLink>
        </template>
      </SectionHeader>
      <div
        v-if="totalCards.length || canEdit"
        class="flex gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <TotalCard
          v-for="t in totalCards"
          :key="t.id"
          :name="t.name"
          :value="formatShort(t.value)"
          :caption="`${t.accounts.length} akun${t.on_transactions ? ' · di Transaksi' : ''}`"
          :on="t.on_transactions"
          @click="openTotal(t)"
        />
        <TotalCard
          v-if="canEdit"
          add
          name="+ Total baru"
          caption="Kelompokkan akun"
          @click="openTotal(null)"
        />
      </div>

      <NetWorthSpark
        :year="viewYear"
        :can-prev="canPrevYear"
        :can-next="canNextYear"
        :points="trend"
        :current="`${year}-${month}`"
        :loading="yearData.query.isPlaceholderData.value"
        :note="
          monthly.available.value
            ? accounts.isPending.value || yearData.query.isPending.value
              ? 'Memuat…'
              : undefined
            : 'Tren belum tersedia: database perlu diperbarui.'
        "
        @pick="pickTrendMonth"
        @year="shiftYear"
      />

      <EmptyCard v-if="accounts.isPending.value" title="Memuat akun…" />
      <EmptyCard
        v-else-if="!views.length"
        title="Belum ada akun"
        description="Tambahkan rekening, e-wallet, atau dompet tunai."
      >
        <IosButton v-if="canEdit" variant="soft" @click="openForm(null)">Tambah akun</IosButton>
      </EmptyCard>

      <!-- Grup akun; iPad dan desktop 2 kolom -->
      <div v-else class="md:columns-2 md:gap-0 [&>section]:break-inside-avoid">
        <section v-for="g in views" :key="g.id">
          <button
            type="button"
            class="flex w-full items-baseline justify-between gap-3 pb-[7px] pl-8 pr-8 pt-[18px] text-left text-note uppercase tracking-[0.02em] text-muted-foreground active:opacity-60"
            :aria-expanded="!collapsed.includes(g.id)"
            @click="toggleGroup(g.id)"
          >
            <span class="flex min-w-0 items-center gap-1">
              <ChevronRight
                :class="[
                  'size-3 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
                  !collapsed.includes(g.id) && 'rotate-90',
                ]"
                stroke-width="3"
                aria-hidden="true"
              />
              <span class="truncate">{{ g.name }}</span>
            </span>
            <span :class="['shrink-0 normal-case', g.total < 0 && 'text-exp']">{{
              formatRupiah(g.total)
            }}</span>
          </button>
          <div v-if="!collapsed.includes(g.id)" class="mx-4 overflow-hidden rounded-group bg-card">
            <AccountRow
              v-for="i in g.items"
              :key="i.account.id"
              :icon="g.style.icon"
              :tone="g.style.tone"
              :name="i.account.name"
              :subtitle="subtitleOf(i.account)"
              :balance="formatRupiah(i.balance)"
              :negative="i.balance < 0"
              :selectable="canEdit"
              :selecting="selecting"
              :selected="selected.includes(i.account.id)"
              @open="tapRow(i.account)"
              @longpress="startSelect(i.account)"
            />
          </div>
        </section>
      </div>

      <!-- Diarsipkan -->
      <template v-if="archived.length">
        <button
          type="button"
          class="mt-2 flex w-full items-baseline justify-between gap-3 px-8 pb-[7px] pt-[18px] text-left text-note uppercase tracking-[0.02em] text-muted-foreground active:opacity-60"
          :aria-expanded="showArchived"
          @click="showArchived = !showArchived"
        >
          <span class="flex items-center gap-1">
            <ChevronRight
              :class="[
                'size-3 transition-transform duration-200 ease-out motion-reduce:transition-none',
                showArchived && 'rotate-90',
              ]"
              stroke-width="3"
              aria-hidden="true"
            />
            Diarsipkan
          </span>
          <span class="normal-case">{{ archived.length }}</span>
        </button>
        <div v-if="showArchived" class="mx-4 overflow-hidden rounded-group bg-card">
          <GroupRow
            v-for="a in archived"
            :key="a.id"
            :title="a.name"
            subtitle="Transaksinya tetap tersimpan"
            :value="formatRupiah(a.balance)"
            :to="`/accounts/${a.id}`"
            chevron
            class="opacity-70"
          >
            <template #icon><ToneIcon :icon="Wallet" tone="gray" size="sm" solid /></template>
          </GroupRow>
        </div>
      </template>

      <p
        v-if="canEdit && views.length && !selecting"
        class="m-0 px-8 pt-3 text-center text-note text-muted-foreground"
      >
        Tahan akun untuk memilih banyak.
      </p>
    </MonthSwipe>

    <!-- Bilah aksi pilih banyak (kaca, melayang di atas tab bar) -->
    <div
      v-if="selecting"
      class="select-bar sticky bottom-[calc(env(safe-area-inset-bottom,0px)+86px)] z-10 mx-3 mt-4 flex flex-col gap-2 rounded-[22px] px-3 pb-3 pt-2.5 md:bottom-4"
      role="toolbar"
      aria-label="Aksi untuk akun terpilih"
    >
      <span class="px-1 text-note text-muted-foreground">
        <b class="text-foreground">{{ chosen.length }}</b> dari {{ visible.length }} akun dipilih
      </span>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          :class="BULK_BTN"
          :disabled="!chosen.length || bulkBusy"
          @click="groupPicker = true"
        >
          <FolderInput aria-hidden="true" />Pindah grup
        </button>
        <button
          type="button"
          :class="BULK_BTN"
          :disabled="!chosen.length || bulkBusy"
          @click="bulkSet('archived', true, 'diarsipkan')"
        >
          <Archive aria-hidden="true" />Arsipkan
        </button>
        <button
          v-if="hasTotals"
          type="button"
          :class="BULK_BTN"
          :disabled="!chosen.length || bulkBusy"
          @click="totalPicker = true"
        >
          <Sigma aria-hidden="true" />Atur total
        </button>
        <button
          v-else
          type="button"
          :class="BULK_BTN"
          :disabled="!chosen.length || bulkBusy"
          @click="
            bulkSet(
              'include_in_total',
              !chosen.every((a) => a.include_in_total),
              chosen.every((a) => a.include_in_total) ? 'tidak ikut total aset' : 'ikut total aset',
            )
          "
        >
          <component
            :is="chosen.every((a) => a.include_in_total) ? EyeOff : Eye"
            aria-hidden="true"
          />
          {{ chosen.every((a) => a.include_in_total) ? 'Tidak ikut total' : 'Ikut total' }}
        </button>
      </div>
    </div>

    <!-- Menu …: total akun, grup, pilih banyak, urutkan, buku -->
    <IosSheet v-model:open="menuOpen" title="Akun">
      <div class="overflow-hidden rounded-group bg-fill">
        <GroupRow
          title="Total akun"
          :subtitle="
            hasTotals ? `${totalViews.length} total` : 'Kelompokkan akun, mis. Uang bulanan'
          "
          chevron
          @click="fromMenu(() => navigateTo('/accounts/totals'))"
        >
          <template #icon><ToneIcon :icon="Sigma" tone="indigo" size="sm" solid /></template>
        </GroupRow>
        <GroupRow
          title="Grup akun"
          subtitle="Tambah, ubah, urutkan grup"
          chevron
          @click="fromMenu(() => navigateTo('/accounts/groups'))"
        >
          <template #icon><ToneIcon :icon="FolderCog" tone="blue" size="sm" solid /></template>
        </GroupRow>
        <template v-if="canEdit && views.length">
          <GroupRow
            title="Pilih banyak"
            subtitle="Pindah grup, arsipkan, atau atur total sekaligus"
            @click="fromMenu(() => startSelect())"
          >
            <template #icon><ToneIcon :icon="ListChecks" tone="green" size="sm" solid /></template>
          </GroupRow>
          <GroupRow
            title="Urutkan"
            subtitle="Urutan grup dan akun"
            @click="fromMenu(() => (sorting = true))"
          >
            <template #icon
              ><ToneIcon :icon="ArrowDownUp" tone="orange" size="sm" solid
            /></template>
          </GroupRow>
        </template>
        <GroupRow
          title="Buku"
          :value="book?.name"
          chevron
          @click="fromMenu(() => navigateTo('/settings/books'))"
        >
          <template #icon><ToneIcon :icon="BookOpen" tone="gray" size="sm" solid /></template>
        </GroupRow>
      </div>
    </IosSheet>

    <!-- Pindah grup -->
    <IosSheet
      v-model:open="groupPicker"
      :title="creatingGroup ? undefined : `Pindahkan ${chosen.length} akun ke`"
      label="Grup baru"
    >
      <!-- Grup tujuan belum ada: buat di sini, akun langsung dipindah ke grup baru -->
      <AccountGroupForm
        v-if="creatingGroup"
        :group="null"
        title-id="group-picker-title"
        @created="(g) => moveTo(g.id, g.name)"
        @close="creatingGroup = false"
      />
      <div v-else class="overflow-hidden rounded-group bg-fill">
        <GroupRow
          title="Grup baru"
          subtitle="Buat grup, lalu pindahkan akunnya ke sana"
          @click="creatingGroup = true"
        >
          <template #icon><ToneIcon :icon="FolderPlus" tone="blue" size="sm" solid /></template>
        </GroupRow>
        <GroupRow
          v-for="g in groups.data.value"
          :key="g.id"
          :title="g.name"
          :subtitle="groupStyle(g).label"
          @click="moveTo(g.id, g.name)"
        >
          <template #icon><ToneIcon v-bind="groupStyle(g)" size="sm" solid /></template>
        </GroupRow>
      </div>
    </IosSheet>

    <!-- Atur total -->
    <IosSheet
      v-model:open="totalPicker"
      :title="creatingTotal ? undefined : `Masukkan ${chosen.length} akun ke`"
      label="Total baru"
    >
      <!-- Total tujuan belum ada: buat di sini, akun langsung dimasukkan -->
      <AccountTotalForm
        v-if="creatingTotal"
        :total="null"
        no-accounts
        title-id="total-picker-title"
        @created="(t) => setTotal(t.id, t.name)"
        @close="creatingTotal = false"
      />
      <div v-else class="overflow-hidden rounded-group bg-fill">
        <GroupRow
          title="Total baru"
          subtitle="Buat total, lalu masukkan akunnya ke sana"
          @click="creatingTotal = true"
        >
          <template #icon><ToneIcon :icon="Plus" tone="indigo" size="sm" solid /></template>
        </GroupRow>
        <GroupRow
          v-for="t in totalViews"
          :key="t.id"
          :title="t.name"
          :subtitle="`${t.accounts.length} akun${t.on_transactions ? ' · tampil di Transaksi' : ''}`"
          @click="setTotal(t.id, t.name)"
        >
          <template #icon><ToneIcon :icon="Sigma" tone="indigo" size="sm" solid /></template>
        </GroupRow>
        <GroupRow
          title="Tidak ikut total"
          subtitle="Untuk akun titipan atau yang bukan milikmu"
          @click="setTotal(null, '')"
        >
          <template #icon><ToneIcon :icon="EyeOff" tone="gray" size="sm" solid /></template>
        </GroupRow>
      </div>
    </IosSheet>

    <Overlay v-model:open="formOpen" labelledby="account-form-title">
      <AccountForm
        :key="formKey"
        :account="editing"
        title-id="account-form-title"
        @close="formOpen = false"
      />
    </Overlay>
    <Overlay v-model:open="totalFormOpen" labelledby="total-form-title">
      <AccountTotalForm
        :key="formKey"
        :total="editingTotal"
        title-id="total-form-title"
        @close="totalFormOpen = false"
      />
    </Overlay>
  </div>
</template>

<style scoped>
/* Bilah aksi melayang: Liquid Glass seperti tab bar (solid saat Reduce Transparency lewat token) */
.select-bar {
  background: var(--glass-bar);
  border: 0.5px solid var(--glass-bar-line);
  box-shadow: var(--glass-bar-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}
@media (prefers-reduced-transparency: reduce) {
  .select-bar {
    background: var(--card);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
