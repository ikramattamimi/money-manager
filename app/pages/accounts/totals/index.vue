<script setup lang="ts">
import { Plus } from '@lucide/vue';
import Overlay from '@/components/base/Overlay.vue';
import SortableList from '@/components/data/SortableList.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import NavBar from '@/components/ios/NavBar.vue';
import SectionHeader from '@/components/ios/SectionHeader.vue';
import AccountTotalForm from '@/components/money/AccountTotalForm.vue';
import type { AccountTotal } from '@/features/accounts/api';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { formatRupiah } from '@/lib/format';

// Total akun (mockup totals): daftar Σ dengan saldo sekarang, lalu akun yang
// belum masuk total mana pun. Ketuk total = ubah (nama, tampil di Transaksi,
// centang akun). Urutkan lewat tombol di judul grup. iPad/desktop: form di dialog.
definePageMeta({ layout: 'app' });
useHead({ title: 'Total akun · Money Manager' });

const { canEdit } = useActiveBook();
const { accountTotals, totalViews, grouped, style } = useAccounts();
const mutations = useAccountMutations();

const sorting = ref(false);
/** Akun aktif tanpa total, urut seperti di halaman Akun */
const outside = computed(() =>
  grouped.value.flatMap((g) =>
    g.accounts.filter((a) => !a.total_id).map((a) => ({ ...a, group: g })),
  ),
);
// Ikon Σ total (mockup .sigma): kotak nila solid seperti ikon Pengaturan
const SIGMA =
  'grid size-7.5 shrink-0 place-items-center rounded-[7px] bg-[var(--tone-indigo)] text-row font-extrabold text-white';

const formOpen = ref(false);
const editing = ref<AccountTotal | null>(null);
const session = ref(0);
const { openAsPage } = useFormPage();
function openForm(total: AccountTotal | null) {
  if (!canEdit.value) return;
  if (openAsPage(total ? `/accounts/totals/${total.id}` : '/accounts/totals/new')) return;
  editing.value = total;
  session.value++;
  formOpen.value = true;
}
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] pb-6 md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Total akun" back="Akun" back-to="/accounts" line class="sticky top-0 md:static">
      <template #right>
        <IconButton v-if="canEdit" label="Tambah total" accent @click="openForm(null)">
          <Plus stroke-width="2.2" aria-hidden="true" />
        </IconButton>
      </template>
    </NavBar>

    <EmptyCard v-if="accountTotals.isPending.value" title="Memuat total…" />
    <EmptyCard
      v-else-if="!totalViews.length"
      title="Belum ada total"
      description="Buat total seperti Uang bulanan atau Investasi, lalu centang akunnya."
    >
      <IosButton v-if="canEdit" variant="soft" @click="openForm(null)">Buat total</IosButton>
    </EmptyCard>

    <template v-else>
      <SectionHeader label="Total">
        <template #aside>
          <button
            v-if="canEdit && totalViews.length > 1"
            type="button"
            class="normal-case text-primary-accent active:opacity-50"
            :aria-pressed="sorting"
            @click="sorting = !sorting"
          >
            {{ sorting ? 'Selesai' : 'Urutkan' }}
          </button>
          <span v-else class="normal-case">{{ totalViews.length }}</span>
        </template>
      </SectionHeader>

      <div v-if="sorting" class="mx-4 overflow-hidden rounded-group bg-card">
        <SortableList
          :items="totalViews"
          label="Urutan total akun"
          @reorder="mutations.reorderTotals.mutate"
        >
          <template #default="{ item }">
            <GroupRow :title="item.name" :subtitle="`${item.accounts.length} akun`">
              <template #icon><span :class="SIGMA" aria-hidden="true">Σ</span></template>
            </GroupRow>
          </template>
        </SortableList>
      </div>
      <div v-else class="mx-4 overflow-hidden rounded-group bg-card">
        <component
          :is="GroupRow"
          v-for="t in totalViews"
          :key="t.id"
          :title="t.name"
          :subtitle="`${t.accounts.length} akun${t.on_transactions ? ' · tampil di Transaksi' : ''}`"
          :value="formatRupiah(t.sum)"
          :value-tone="t.sum < 0 ? 'exp' : undefined"
          strong
          :chevron="canEdit"
          v-on="canEdit ? { click: () => openForm(t) } : {}"
        >
          <template #icon><span :class="SIGMA" aria-hidden="true">Σ</span></template>
        </component>
      </div>
      <p class="m-0 px-8 pt-1.5 text-meta leading-[1.4] text-muted-foreground">
        Tiap akun masuk ke satu total. Satu total bisa tampil di halaman Transaksi: saldonya di atas
        dan transaksinya disaring ke akunnya.
      </p>

      <template v-if="outside.length && !sorting">
        <SectionHeader label="Belum masuk total" :aside="String(outside.length)" />
        <div class="mx-4 overflow-hidden rounded-group bg-card">
          <GroupRow
            v-for="a in outside"
            :key="a.id"
            :title="a.name"
            :subtitle="a.group.name"
            :value="formatRupiah(a.balance)"
            :value-tone="a.balance < 0 ? 'exp' : undefined"
            :to="`/accounts/${a.id}`"
            chevron
          >
            <template #icon><ToneIcon v-bind="style(a.id)" size="sm" solid /></template>
          </GroupRow>
        </div>
        <p class="m-0 px-8 pt-1.5 text-meta leading-[1.4] text-muted-foreground">
          Masukkan lewat centang di form total, atau Pilih banyak di halaman Akun.
        </p>
      </template>
    </template>

    <Overlay v-model:open="formOpen" labelledby="total-form-title">
      <AccountTotalForm
        :key="session"
        :total="editing"
        title-id="total-form-title"
        @close="formOpen = false"
      />
    </Overlay>
  </div>
</template>
