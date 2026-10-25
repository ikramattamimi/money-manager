<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import AccountTotalForm from '@/components/money/AccountTotalForm.vue';

// Tambah total akun sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Total baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/accounts/totals');
</script>

<template>
  <FormPage title="Total baru" title-id="total-page-title" @back="back">
    <AccountTotalForm :total="null" page class="flex-1" title-id="total-page-title" @close="back" />
  </FormPage>
</template>
