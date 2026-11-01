<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import AccountTotalForm from '@/components/money/AccountTotalForm.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';

// Tambah total akun sebagai halaman penuh di HP (mockup total-form; iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Total baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/accounts/totals');
</script>

<template>
  <FormPage title="Total baru" title-id="total-page-title" @back="back">
    <template #action><FormPageSave form="total-page-title-form" /></template>
    <AccountTotalForm :total="null" page title-id="total-page-title" @close="back" />
  </FormPage>
</template>
