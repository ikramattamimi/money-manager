<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import AccountGroupForm from '@/components/money/AccountGroupForm.vue';

// Tambah grup akun sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Grup baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/accounts/groups');
</script>

<template>
  <FormPage title="Grup baru" title-id="group-page-title" @back="back">
    <AccountGroupForm :group="null" page class="flex-1" title-id="group-page-title" @close="back" />
  </FormPage>
</template>
