<script setup lang="ts">
import { ArrowDownUp, Check, ChevronRight, Plus, Wallet } from '@lucide/vue';
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
import PageHero from '@/components/layout/PageHero.vue';
import StatChip from '@/components/layout/StatChip.vue';
import AccountForm from '@/components/money/AccountForm.vue';
import type { Account } from '@/features/accounts/api';
import { ACCOUNT_KIND_STYLE } from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { formatRupiah, formatShort } from '@/lib/format';

definePageMeta({ layout: 'app' });
useHead({ title: 'Akun · Money Manager' });

const { canEdit } = useActiveBook();
const { accounts, grouped, totals } = useAccounts();
const mutations = useAccountMutations();

const sorting = ref(false);
const archived = computed(() => (accounts.data.value ?? []).filter((a) => a.archived));
const showArchived = ref(false);

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
      <template v-if="canEdit" #actions>
        <HeaderButton :aria-pressed="sorting" @click="sorting = !sorting">
          <component :is="sorting ? Check : ArrowDownUp" aria-hidden="true" />{{
            sorting ? 'Selesai' : 'Urutkan'
          }}
        </HeaderButton>
        <HeaderButton @click="openForm(null)"><Plus aria-hidden="true" />Akun</HeaderButton>
      </template>
      <PageHero label="Aset bersih" :value="formatRupiah(totals.net)" />
      <div class="flex flex-wrap gap-1.5">
        <StatChip label="Aset" :value="formatShort(totals.assets)" tone="ok" />
        <StatChip label="Utang" :value="formatShort(totals.debts)" tone="bad" />
      </div>
    </PageHeader>

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
              <template #lead><ToneIcon v-bind="ACCOUNT_KIND_STYLE[g.kind]" /></template>
            </ListRow>
          </template>
        </SortableList>
        <template v-else>
          <NuxtLink
            v-for="a in g.accounts"
            :key="a.id"
            :to="`/accounts/${a.id}`"
            class="block rounded-[10px]"
          >
            <ListRow
              :title="a.name"
              :subtitle="a.include_in_total ? g.name : `${g.name} · tidak ikut total`"
              :value="formatRupiah(a.balance)"
              :value-class="a.balance < 0 ? 'text-bad' : ''"
              class="press hover:bg-surface-2"
            >
              <template #lead><ToneIcon v-bind="ACCOUNT_KIND_STYLE[g.kind]" /></template>
            </ListRow>
          </NuxtLink>
        </template>
      </ListGroup>
    </div>

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
