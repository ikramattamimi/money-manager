<script setup lang="ts">
import { ArrowDownUp, ArrowLeft, Check, FolderOpen, Plus } from '@lucide/vue';
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
import AccountGroupForm from '@/components/money/AccountGroupForm.vue';
import type { AccountGroup } from '@/features/accounts/api';
import { ACCOUNT_KIND_STYLE } from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';

// Kelola grup akun: tambah grup sendiri, ganti nama/jenis, urutkan, hapus yang kosong.
// Urutan grup di sini dipakai di halaman Akun dan pilihan akun di form transaksi.
definePageMeta({ layout: 'app' });
useHead({ title: 'Grup akun · Money Manager' });

const { canEdit } = useActiveBook();
const { accounts, groups } = useAccounts();
const mutations = useAccountMutations();

const sorting = ref(false);
const list = computed(() => groups.data.value ?? []);

function subtitle(g: AccountGroup) {
  const all = (accounts.data.value ?? []).filter((a) => a.group_id === g.id);
  const active = all.filter((a) => !a.archived).length;
  const archived = all.length - active;
  const kind = ACCOUNT_KIND_STYLE[g.kind].label;
  if (!accounts.data.value) return kind;
  if (!all.length) return `${kind} · kosong`;
  return `${kind} · ${active} akun${archived ? `, ${archived} diarsipkan` : ''}`;
}

const formOpen = ref(false);
const editing = ref<AccountGroup | null>(null);
const session = ref(0);
const { openAsPage } = useFormPage();
function openForm(group: AccountGroup | null) {
  if (!canEdit.value) return;
  if (openAsPage(group ? `/accounts/groups/${group.id}` : '/accounts/groups/new')) return;
  editing.value = group;
  session.value++;
  formOpen.value = true;
}
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader title="Grup akun">
      <template #actions>
        <HeaderButton label="Kembali ke Akun" @click="navigateTo('/accounts')"
          ><ArrowLeft aria-hidden="true"
        /></HeaderButton>
        <template v-if="canEdit">
          <HeaderButton v-if="list.length > 1" :aria-pressed="sorting" @click="sorting = !sorting">
            <component :is="sorting ? Check : ArrowDownUp" aria-hidden="true" />{{
              sorting ? 'Selesai' : 'Urutkan'
            }}
          </HeaderButton>
          <HeaderButton @click="openForm(null)"><Plus aria-hidden="true" />Grup</HeaderButton>
        </template>
      </template>
    </PageHeader>

    <Card v-if="groups.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="5" /></Card>
    <Card v-else-if="!list.length" class="mt-3.5">
      <EmptyState
        :icon="FolderOpen"
        title="Belum ada grup"
        description="Buat grup dulu, mis. Bank atau E-Wallet, lalu tambahkan akun ke dalamnya."
      />
    </Card>

    <ListGroup v-else-if="sorting" label="Urutan grup">
      <SortableList
        :items="list"
        label="Urutan grup akun"
        @reorder="mutations.reorderGroups.mutate"
      >
        <template #default="{ item }">
          <ListRow :title="item.name">
            <template #lead><ToneIcon v-bind="ACCOUNT_KIND_STYLE[item.kind]" /></template>
          </ListRow>
        </template>
      </SortableList>
    </ListGroup>

    <ListGroup v-else label="Grup" :aside="`${list.length}`">
      <ListRow
        v-for="g in list"
        :key="g.id"
        :as="canEdit ? 'button' : 'div'"
        :title="g.name"
        :subtitle="subtitle(g)"
        :class="canEdit ? 'press hover:bg-surface-2' : ''"
        @click="openForm(g)"
      >
        <template #lead><ToneIcon v-bind="ACCOUNT_KIND_STYLE[g.kind]" /></template>
      </ListRow>
    </ListGroup>

    <p v-if="list.length && !sorting" class="m-0 mt-2.5 px-2.5 text-xs text-muted-foreground">
      Grup kosong tidak tampil di halaman Akun. Grup yang masih berisi akun tidak bisa dihapus.
    </p>

    <Overlay v-model:open="formOpen" labelledby="group-form-title">
      <AccountGroupForm
        :key="session"
        :group="editing"
        title-id="group-form-title"
        @close="formOpen = false"
      />
    </Overlay>
  </div>
</template>
