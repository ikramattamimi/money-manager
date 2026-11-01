<script setup lang="ts">
import EmptyCard from '@/components/ios/EmptyCard.vue';
import FormPage from '@/components/layout/FormPage.vue';
import AccountForm from '@/components/money/AccountForm.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';
import { useAccounts } from '@/features/accounts/useAccounts';

// Ubah akun sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ubah akun · Money Manager' });

const route = useRoute();
const id = computed(() => String(route.params.id));
const { accounts, byId } = useAccounts();
const account = computed(() => byId.value.get(id.value) ?? null);

const { closePage } = useFormPage();
const back = () => closePage(`/accounts/${id.value}`);
</script>

<template>
  <FormPage title="Ubah akun" title-id="account-page-title" @back="back">
    <template v-if="account" #action><FormPageSave form="account-page-title-form" /></template>
    <EmptyCard v-if="accounts.isPending.value" title="Memuat akun…" class="!mx-0" />
    <AccountForm
      v-else-if="account"
      :key="account.id"
      :account="account"
      page
      title-id="account-page-title"
      @close="back"
    />
    <EmptyCard v-else title="Akun tidak ditemukan" class="!mx-0" />
  </FormPage>
</template>
