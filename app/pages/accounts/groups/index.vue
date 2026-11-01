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
import AccountGroupForm from '@/components/money/AccountGroupForm.vue';
import type { AccountGroup } from '@/features/accounts/api';
import { groupStyle } from '@/features/accounts/style';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';

// Kelola grup akun gaya grup iOS: tambah grup sendiri, ganti nama/jenis,
// urutkan (seret pegangan), hapus yang kosong. Urutan grup di sini dipakai di
// halaman Akun dan pilihan akun di form transaksi. iPad/desktop: form di dialog.
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
  const kind = groupStyle(g).label;
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
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] pb-6 md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar title="Grup akun" back="Akun" back-to="/accounts" line class="sticky top-0 md:static">
      <template #right>
        <IconButton v-if="canEdit" label="Tambah grup" accent @click="openForm(null)">
          <Plus stroke-width="2.2" aria-hidden="true" />
        </IconButton>
      </template>
    </NavBar>

    <EmptyCard v-if="groups.isPending.value" title="Memuat grup…" />
    <EmptyCard
      v-else-if="!list.length"
      title="Belum ada grup"
      description="Buat grup dulu, mis. Bank atau E-Wallet, lalu tambahkan akun ke dalamnya."
    >
      <IosButton v-if="canEdit" variant="soft" @click="openForm(null)">Buat grup</IosButton>
    </EmptyCard>

    <template v-else>
      <SectionHeader label="Grup">
        <template #aside>
          <button
            v-if="canEdit && list.length > 1"
            type="button"
            class="normal-case text-primary-accent active:opacity-50"
            :aria-pressed="sorting"
            @click="sorting = !sorting"
          >
            {{ sorting ? 'Selesai' : 'Urutkan' }}
          </button>
          <span v-else class="normal-case">{{ list.length }}</span>
        </template>
      </SectionHeader>

      <div v-if="sorting" class="mx-4 overflow-hidden rounded-group bg-card">
        <SortableList
          :items="list"
          label="Urutan grup akun"
          @reorder="mutations.reorderGroups.mutate"
        >
          <template #default="{ item }">
            <GroupRow :title="item.name">
              <template #icon><ToneIcon v-bind="groupStyle(item)" size="sm" solid /></template>
            </GroupRow>
          </template>
        </SortableList>
      </div>
      <div v-else class="mx-4 overflow-hidden rounded-group bg-card">
        <component
          :is="GroupRow"
          v-for="g in list"
          :key="g.id"
          :title="g.name"
          :subtitle="subtitle(g)"
          :chevron="canEdit"
          v-on="canEdit ? { click: () => openForm(g) } : {}"
        >
          <template #icon><ToneIcon v-bind="groupStyle(g)" size="sm" solid /></template>
        </component>
      </div>
      <p class="m-0 px-8 pt-1.5 text-meta leading-[1.4] text-muted-foreground">
        {{
          sorting
            ? 'Seret pegangan di kanan untuk mengubah urutan.'
            : 'Grup kosong tidak tampil di halaman Akun. Grup yang masih berisi akun tidak bisa dihapus.'
        }}
      </p>
    </template>

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
