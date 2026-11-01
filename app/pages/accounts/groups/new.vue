<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import AccountGroupForm from '@/components/money/AccountGroupForm.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';

// Tambah grup akun sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Grup baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/accounts/groups');
</script>

<template>
  <FormPage title="Grup baru" title-id="group-page-title" @back="back">
    <template #action><FormPageSave form="group-page-title-form" /></template>
    <AccountGroupForm :group="null" page title-id="group-page-title" @close="back" />
  </FormPage>
</template>
