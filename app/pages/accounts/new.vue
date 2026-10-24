<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import AccountForm from '@/components/money/AccountForm.vue';

// Tambah akun sebagai halaman penuh di HP (iPad/desktop: dialog di /accounts)
definePageMeta({ layout: false });
useHead({ title: 'Akun baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/accounts');
</script>

<template>
  <FormPage title="Akun baru" title-id="account-page-title" @back="back">
    <AccountForm :account="null" page class="flex-1" title-id="account-page-title" @close="back" />
  </FormPage>
</template>
