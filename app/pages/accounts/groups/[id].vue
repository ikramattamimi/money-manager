<script setup lang="ts">
import EmptyCard from '@/components/ios/EmptyCard.vue';
import FormPage from '@/components/layout/FormPage.vue';
import AccountGroupForm from '@/components/money/AccountGroupForm.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';
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
    <template v-if="group" #action><FormPageSave form="group-page-title-form" /></template>
    <EmptyCard v-if="groups.isPending.value" title="Memuat grup…" class="!mx-0" />
    <AccountGroupForm
      v-else-if="group"
      :key="group.id"
      :group="group"
      page
      title-id="group-page-title"
      @close="back"
    />
    <EmptyCard v-else title="Grup tidak ditemukan" class="!mx-0" />
  </FormPage>
</template>
