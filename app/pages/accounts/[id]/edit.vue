<script setup lang="ts">
import { Wallet } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import FormPage from '@/components/layout/FormPage.vue';
import AccountForm from '@/components/money/AccountForm.vue';
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
    <Skeleton v-if="accounts.isPending.value" :rows="4" />
    <AccountForm
      v-else-if="account"
      :key="account.id"
      :account="account"
      page
      class="flex-1"
      title-id="account-page-title"
      @close="back"
    />
    <Card v-else><EmptyState :icon="Wallet" title="Akun tidak ditemukan" /></Card>
  </FormPage>
</template>
