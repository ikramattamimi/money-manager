<script setup lang="ts">
import { ArrowDownUp, ArrowLeft, Check, Plus, Receipt, Sigma } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import SortableList from '@/components/data/SortableList.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AccountTotalForm from '@/components/money/AccountTotalForm.vue';
import type { AccountTotal } from '@/features/accounts/api';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { formatRupiah } from '@/lib/format';

// Kelola total akun: "Uang bulanan", "Investasi", dll. Tiap akun masuk ke satu
// total (diatur di form akun atau Pilih banyak di halaman Akun). Satu total bisa
// ditampilkan di halaman Transaksi.
definePageMeta({ layout: 'app' });
useHead({ title: 'Total akun · Money Manager' });

const { canEdit } = useActiveBook();
const { accountTotals, totalViews, active } = useAccounts();
const mutations = useAccountMutations();

const sorting = ref(false);
const outside = computed(() => active.value.filter((a) => !a.total_id));

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
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Total akun">
      <template #actions>
        <HeaderButton label="Kembali ke Akun" @click="navigateTo('/accounts')"
          ><ArrowLeft aria-hidden="true"
        /></HeaderButton>
        <template v-if="canEdit">
          <HeaderButton
            v-if="totalViews.length > 1"
            :aria-pressed="sorting"
            @click="sorting = !sorting"
          >
            <component :is="sorting ? Check : ArrowDownUp" aria-hidden="true" />{{
              sorting ? 'Selesai' : 'Urutkan'
            }}
          </HeaderButton>
          <HeaderButton @click="openForm(null)"><Plus aria-hidden="true" />Total</HeaderButton>
        </template>
      </template>
    </PageHeader>

    <Card v-if="accountTotals.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="3" /></Card>
    <Card v-else-if="!totalViews.length" class="mt-3.5">
      <EmptyState
        :icon="Sigma"
        title="Belum ada total"
        description="Buat total seperti Uang bulanan atau Investasi, lalu masukkan akunnya."
      />
    </Card>

    <ListGroup v-else-if="sorting" label="Urutan total">
      <SortableList
        :items="totalViews"
        label="Urutan total akun"
        @reorder="mutations.reorderTotals.mutate"
      >
        <template #default="{ item }">
          <ListRow :title="item.name" :subtitle="`${item.accounts.length} akun`">
            <template #lead><ToneIcon :icon="Sigma" tone="primary" /></template>
          </ListRow>
        </template>
      </SortableList>
    </ListGroup>

    <ListGroup v-else label="Total" :aside="`${totalViews.length}`">
      <ListRow
        v-for="t in totalViews"
        :key="t.id"
        :as="canEdit ? 'button' : 'div'"
        :title="t.name"
        :subtitle="`${t.accounts.length} akun${t.on_transactions ? ' · tampil di Transaksi' : ''}`"
        :value="formatRupiah(t.sum)"
        :value-class="t.sum < 0 ? 'text-bad' : ''"
        :class="canEdit ? 'press hover:bg-surface-2' : ''"
        @click="openForm(t)"
      >
        <template #lead>
          <ToneIcon
            :icon="t.on_transactions ? Receipt : Sigma"
            :tone="t.on_transactions ? 'ok' : 'primary'"
          />
        </template>
      </ListRow>
    </ListGroup>

    <p v-if="!sorting && totalViews.length" class="m-0 mt-2.5 px-2.5 text-xs text-muted-foreground">
      {{
        [
          'Aset bersih di halaman Akun menjumlahkan semua akun yang masuk total mana pun.',
          outside.length ? `${outside.length} akun tidak ikut total.` : '',
          'Atur total akun lewat form akun, atau Pilih banyak di halaman Akun.',
        ]
          .filter(Boolean)
          .join(' ')
      }}
    </p>

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
