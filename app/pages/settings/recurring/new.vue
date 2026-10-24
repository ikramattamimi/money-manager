<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import RecurringForm from '@/components/money/RecurringForm.vue';

// Transaksi berulang baru sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Transaksi berulang baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/settings/recurring');
</script>

<template>
  <FormPage title="Berulang baru" title-id="recurring-page-title" @back="back">
    <RecurringForm :rule="null" page class="flex-1" title-id="recurring-page-title" @close="back" />
  </FormPage>
</template>
