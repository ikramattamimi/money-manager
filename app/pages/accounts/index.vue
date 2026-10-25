<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import {
  Archive,
  ArrowDownUp,
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FolderCog,
  FolderInput,
  FolderPlus,
  ListChecks,
  Plus,
  Sigma,
  Wallet,
  X,
} from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import SelectCheck from '@/components/data/SelectCheck.vue';
import SelectionBar from '@/components/data/SelectionBar.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import SortableList from '@/components/data/SortableList.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import PageHero from '@/components/layout/PageHero.vue';
import StatChip from '@/components/layout/StatChip.vue';
import AccountForm from '@/components/money/AccountForm.vue';
import AccountGroupForm from '@/components/money/AccountGroupForm.vue';
import AccountTotalForm from '@/components/money/AccountTotalForm.vue';
import { Button } from '@/components/ui/button';
import { accountsApi, type Account } from '@/features/accounts/api';
import { accountKeys } from '@/features/accounts/keys';
import { groupStyle } from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { formatRupiah, formatShort } from '@/lib/format';

definePageMeta({ layout: 'app' });
useHead({ title: 'Akun · Money Manager' });

const { canEdit, book } = useActiveBook();
const { accounts, grouped, groups, totals, totalViews, totalById } = useAccounts();
const hasTotals = computed(() => totalViews.value.length > 0);
const mutations = useAccountMutations();

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
function stopSelecting() {
  selecting.value = false;
  selected.value = [];
}
watch(sorting, (on) => on && stopSelecting());
// Tombol + disembunyikan selama memilih: bilah aksi ada di tempat yang sama
const hideAdd = useState('ui:selecting', () => false);
watch(selecting, (on) => (hideAdd.value = on));
onBeforeUnmount(() => (hideAdd.value = false));

const bulkBusy = ref(false);
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
/** Nama total akun untuk keterangan baris */
// Nama total hanya perlu ditulis kalau ada lebih dari satu total
const totalLabel = (a: Account) => {
  const total = a.total_id ? totalById.value.get(a.total_id) : undefined;
  if (!total && !a.include_in_total) return 'tidak ikut total';
  if (!total) return hasTotals.value ? 'tidak ikut total' : '';
  return totalViews.value.length > 1 ? total.name : '';
};
const subtitleOf = (a: Account, group: string) =>
  [group, totalLabel(a)].filter(Boolean).join(' · ');

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

const formOpen = ref(false);
const editing = ref<Account | null>(null);
const formKey = ref(0);
const { openAsPage } = useFormPage();
function openForm(account: Account | null) {
  if (openAsPage(account ? `/accounts/${account.id}/edit` : '/accounts/new')) return;
  editing.value = account;
  formKey.value++;
  formOpen.value = true;
}
</script>

<template>
  <div>
    <PageHeader title="Akun" :summary="formatRupiah(totals.net)">
      <template #actions>
        <HeaderButton
          :label="`Buku ${book?.name ?? ''}, ganti buku`"
          @click="navigateTo('/settings/books')"
        >
          <BookOpen aria-hidden="true" /><span class="max-w-[96px] truncate">{{ book?.name }}</span>
        </HeaderButton>
        <template v-if="canEdit">
          <HeaderButton label="Kelola grup akun" @click="navigateTo('/accounts/groups')">
            <FolderCog aria-hidden="true" />
          </HeaderButton>
          <HeaderButton :aria-pressed="sorting" @click="sorting = !sorting">
            <component :is="sorting ? Check : ArrowDownUp" aria-hidden="true" />{{
              sorting ? 'Selesai' : 'Urutkan'
            }}
          </HeaderButton>
          <HeaderButton @click="openForm(null)"><Plus aria-hidden="true" />Akun</HeaderButton>
        </template>
      </template>
      <PageHero label="Aset bersih" :value="formatRupiah(totals.net)" />
      <div class="flex flex-wrap gap-1.5">
        <StatChip label="Aset" :value="formatShort(totals.assets)" tone="ok" />
        <StatChip label="Utang" :value="formatShort(totals.debts)" tone="bad" />
      </div>
      <!-- Total buatan sendiri; ketuk untuk mengelola -->
      <button
        type="button"
        class="press -mt-0.5 flex flex-wrap items-center gap-1.5 self-start rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-grad"
        :aria-label="hasTotals ? 'Kelola total akun' : 'Buat total akun, mis. Uang bulanan'"
        @click="navigateTo('/accounts/totals')"
      >
        <StatChip v-for="t in totalViews" :key="t.id" :label="t.name" :value="formatShort(t.sum)" />
        <StatChip v-if="!hasTotals" label="Total" value="+ Buat" />
      </button>
    </PageHeader>

    <!-- Di luar rantai v-if di bawah supaya tidak memutus v-else daftar akun -->
    <div
      v-if="canEdit && grouped.length && !sorting"
      class="mt-3 flex items-center justify-between gap-2 px-1"
    >
      <span class="text-xs text-muted-foreground">{{
        selecting ? 'Ketuk akun untuk memilih' : 'Pindah grup, arsipkan, atau atur total sekaligus'
      }}</span>
      <Button
        :variant="selecting ? 'default' : 'secondary'"
        :aria-pressed="selecting"
        @click="selecting ? stopSelecting() : (selecting = true)"
      >
        <component :is="selecting ? Check : ListChecks" />{{
          selecting ? 'Selesai' : 'Pilih banyak'
        }}
      </Button>
    </div>

    <!-- Mode Urutkan: urutan grup dulu, lalu urutan akun di dalam tiap grup -->
    <ListGroup v-if="sorting && grouped.length > 1" label="Urutan grup">
      <SortableList :items="grouped" label="Urutan grup akun" @reorder="reorderGroups">
        <template #default="{ item }">
          <ListRow :title="item.name" :subtitle="`${item.accounts.length} akun`">
            <template #lead><ToneIcon v-bind="groupStyle(item)" /></template>
          </ListRow>
        </template>
      </SortableList>
    </ListGroup>

    <Card v-if="accounts.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="4" /></Card>
    <Card v-else-if="!grouped.length" class="mt-3.5">
      <EmptyState
        :icon="Wallet"
        title="Belum ada akun"
        description="Tambahkan rekening, e-wallet, atau dompet tunai."
      />
    </Card>

    <!-- iPad dan desktop: grup akun 2 kolom -->
    <div v-else class="md:columns-2 md:gap-3.5 [&>section]:break-inside-avoid">
      <ListGroup v-for="g in grouped" :key="g.id" :label="g.name" :aside="formatRupiah(g.sum)">
        <SortableList
          v-if="sorting"
          :items="g.accounts"
          :label="`Urutan akun ${g.name}`"
          @reorder="mutations.reorder.mutate"
        >
          <template #default="{ item }">
            <ListRow :title="item.name" :subtitle="formatRupiah(item.balance)">
              <template #lead><ToneIcon v-bind="groupStyle(g)" /></template>
            </ListRow>
          </template>
        </SortableList>
        <template v-else-if="selecting">
          <ListRow
            v-for="a in g.accounts"
            :key="a.id"
            as="button"
            :title="a.name"
            :subtitle="subtitleOf(a, g.name)"
            :value="formatRupiah(a.balance)"
            :value-class="a.balance < 0 ? 'text-bad' : ''"
            :aria-pressed="selected.includes(a.id)"
            class="press hover:bg-surface-2"
            @click="toggle(a.id)"
          >
            <template #lead><SelectCheck :selected="selected.includes(a.id)" /></template>
          </ListRow>
        </template>
        <template v-else>
          <NuxtLink
            v-for="a in g.accounts"
            :key="a.id"
            :to="`/accounts/${a.id}`"
            class="block rounded-[10px]"
          >
            <ListRow
              :title="a.name"
              :subtitle="subtitleOf(a, g.name)"
              :value="formatRupiah(a.balance)"
              :value-class="a.balance < 0 ? 'text-bad' : ''"
              class="press hover:bg-surface-2"
            >
              <template #lead><ToneIcon v-bind="groupStyle(g)" /></template>
            </ListRow>
          </NuxtLink>
        </template>
      </ListGroup>
    </div>

    <SelectionBar
      v-if="selecting"
      :count="chosen.length"
      :total="visible.length"
      label="Aksi untuk akun terpilih"
      @toggle-all="toggleAll"
      @close="stopSelecting"
    >
      <Button :disabled="!chosen.length || bulkBusy" @click="groupPicker = true">
        <FolderInput />Pindah grup
      </Button>
      <Button
        variant="secondary"
        :disabled="!chosen.length || bulkBusy"
        @click="bulkSet('archived', true, 'diarsipkan')"
      >
        <Archive />Arsipkan
      </Button>
      <Button
        v-if="hasTotals"
        variant="secondary"
        :disabled="!chosen.length || bulkBusy"
        @click="totalPicker = true"
      >
        <Sigma />Atur total
      </Button>
      <template v-else>
        <Button
          variant="secondary"
          :disabled="!chosen.length || bulkBusy"
          @click="bulkSet('include_in_total', true, 'ikut total aset')"
        >
          <Eye />Ikut total
        </Button>
        <Button
          variant="secondary"
          :disabled="!chosen.length || bulkBusy"
          @click="bulkSet('include_in_total', false, 'tidak ikut total aset')"
        >
          <EyeOff />Tidak ikut total
        </Button>
      </template>
    </SelectionBar>

    <Overlay v-model:open="totalPicker" labelledby="total-picker-title">
      <!-- Total tujuan belum ada: buat di sini, akun langsung dimasukkan -->
      <AccountTotalForm
        v-if="creatingTotal"
        :total="null"
        title-id="total-picker-title"
        @created="(t) => setTotal(t.id, t.name)"
        @close="creatingTotal = false"
      />
      <div v-else class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <h2 id="total-picker-title" class="m-0 flex-1 text-panel font-bold">
            Masukkan {{ chosen.length }} akun ke
          </h2>
          <Button variant="ghost" size="icon" aria-label="Tutup" @click="totalPicker = false">
            <X />
          </Button>
        </div>
        <div class="flex max-h-[55dvh] flex-col gap-0.5 overflow-y-auto" data-no-drag>
          <ListRow
            as="button"
            title="Total baru"
            subtitle="Buat total, lalu masukkan akunnya ke sana"
            class="press hover:bg-surface-2"
            @click="creatingTotal = true"
          >
            <template #lead><ToneIcon :icon="Plus" tone="primary" size="sm" /></template>
          </ListRow>
          <ListRow
            v-for="t in totalViews"
            :key="t.id"
            as="button"
            :title="t.name"
            :subtitle="`${t.accounts.length} akun${t.on_transactions ? ' · tampil di Transaksi' : ''}`"
            class="press hover:bg-surface-2"
            @click="setTotal(t.id, t.name)"
          >
            <template #lead><ToneIcon :icon="Sigma" tone="primary" size="sm" /></template>
          </ListRow>
          <ListRow
            as="button"
            title="Tidak ikut total"
            subtitle="Untuk akun titipan atau yang bukan milikmu"
            class="press hover:bg-surface-2"
            @click="setTotal(null, '')"
          >
            <template #lead><ToneIcon :icon="EyeOff" tone="neutral" size="sm" /></template>
          </ListRow>
        </div>
      </div>
    </Overlay>

    <template v-if="archived.length">
      <button
        type="button"
        class="press mt-4 flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
        :aria-expanded="showArchived"
        @click="showArchived = !showArchived"
      >
        Diarsipkan ({{ archived.length }})
        <ChevronRight
          :class="['size-4 transition-transform duration-150', showArchived && 'rotate-90']"
          aria-hidden="true"
        />
      </button>
      <Card v-if="showArchived" class="flex flex-col gap-0.5 p-1">
        <ListRow
          v-for="a in archived"
          :key="a.id"
          :as="canEdit ? 'button' : 'div'"
          :title="a.name"
          subtitle="Diarsipkan · transaksinya tetap tersimpan"
          :value="formatRupiah(a.balance)"
          class="opacity-70"
          @click="canEdit && openForm(a)"
        >
          <template #lead><ToneIcon :icon="Wallet" tone="neutral" /></template>
        </ListRow>
      </Card>
    </template>

    <Overlay v-model:open="groupPicker" labelledby="group-picker-title">
      <!-- Grup tujuan belum ada: buat di sini, akun langsung dipindah ke grup baru -->
      <AccountGroupForm
        v-if="creatingGroup"
        :group="null"
        title-id="group-picker-title"
        @created="(g) => moveTo(g.id, g.name)"
        @close="creatingGroup = false"
      />
      <div v-else class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <h2 id="group-picker-title" class="m-0 flex-1 text-panel font-bold">
            Pindahkan {{ chosen.length }} akun ke
          </h2>
          <Button variant="ghost" size="icon" aria-label="Tutup" @click="groupPicker = false">
            <X />
          </Button>
        </div>
        <div class="flex max-h-[55dvh] flex-col gap-0.5 overflow-y-auto" data-no-drag>
          <ListRow
            as="button"
            title="Grup baru"
            subtitle="Buat grup, lalu pindahkan akunnya ke sana"
            class="press hover:bg-surface-2"
            @click="creatingGroup = true"
          >
            <template #lead><ToneIcon :icon="FolderPlus" tone="primary" size="sm" /></template>
          </ListRow>
          <ListRow
            v-for="g in groups.data.value"
            :key="g.id"
            as="button"
            :title="g.name"
            :subtitle="groupStyle(g).label"
            class="press hover:bg-surface-2"
            @click="moveTo(g.id, g.name)"
          >
            <template #lead><ToneIcon v-bind="groupStyle(g)" size="sm" /></template>
          </ListRow>
        </div>
      </div>
    </Overlay>

    <Overlay v-model:open="formOpen" labelledby="account-form-title">
      <AccountForm
        :key="formKey"
        :account="editing"
        title-id="account-form-title"
        @close="formOpen = false"
      />
    </Overlay>
  </div>
</template>
