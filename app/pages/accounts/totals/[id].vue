<script setup lang="ts">
import EmptyCard from '@/components/ios/EmptyCard.vue';
import FormPage from '@/components/layout/FormPage.vue';
import AccountTotalForm from '@/components/money/AccountTotalForm.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';
import { useAccounts } from '@/features/accounts/useAccounts';

// Ubah total akun sebagai halaman penuh di HP (mockup total-form; iPad/desktop: dialog)
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
    <template v-if="total" #action><FormPageSave form="total-page-title-form" /></template>
    <EmptyCard v-if="accountTotals.isPending.value" title="Memuat total…" class="!mx-0" />
    <AccountTotalForm
      v-else-if="total"
      :key="total.id"
      :total="total"
      page
      title-id="total-page-title"
      @close="back"
    />
    <EmptyCard v-else title="Total tidak ditemukan" class="!mx-0" />
  </FormPage>
</template>
