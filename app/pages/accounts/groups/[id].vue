<script setup lang="ts">
import { FolderOpen } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import FormPage from '@/components/layout/FormPage.vue';
import AccountGroupForm from '@/components/money/AccountGroupForm.vue';
import { useAccounts } from '@/features/accounts/useAccounts';

// Ubah grup akun sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ubah grup · Money Manager' });

const route = useRoute();
const { groups, groupById } = useAccounts();
const group = computed(() => groupById.value.get(String(route.params.id)) ?? null);

const { closePage } = useFormPage();
const back = () => closePage('/accounts/groups');
</script>

<template>
  <FormPage title="Ubah grup" title-id="group-page-title" @back="back">
    <Skeleton v-if="groups.isPending.value" :rows="3" />
    <AccountGroupForm
      v-else-if="group"
      :key="group.id"
      :group="group"
      page
      class="flex-1"
      title-id="group-page-title"
      @close="back"
    />
    <Card v-else><EmptyState :icon="FolderOpen" title="Grup tidak ditemukan" /></Card>
  </FormPage>
</template>
