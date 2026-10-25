<script setup lang="ts">
import { Sigma } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import FormPage from '@/components/layout/FormPage.vue';
import AccountTotalForm from '@/components/money/AccountTotalForm.vue';
import { useAccounts } from '@/features/accounts/useAccounts';

// Ubah total akun sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ubah total · Money Manager' });

const route = useRoute();
const { accountTotals } = useAccounts();
const total = computed(
  () => (accountTotals.data.value ?? []).find((t) => t.id === String(route.params.id)) ?? null,
);

const { closePage } = useFormPage();
const back = () => closePage('/accounts/totals');
</script>

<template>
  <FormPage title="Ubah total" title-id="total-page-title" @back="back">
    <Skeleton v-if="accountTotals.isPending.value" :rows="3" />
    <AccountTotalForm
      v-else-if="total"
      :key="total.id"
      :total="total"
      page
      class="flex-1"
      title-id="total-page-title"
      @close="back"
    />
    <Card v-else><EmptyState :icon="Sigma" title="Total tidak ditemukan" /></Card>
  </FormPage>
</template>
