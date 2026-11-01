<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';
import RecurringForm from '@/components/money/RecurringForm.vue';

// Ulangi baru sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ulangi baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/settings/recurring');
</script>

<template>
  <FormPage title="Ulangi baru" title-id="recurring-page-title" @back="back">
    <template #action><FormPageSave form="recurring-page-title-form" /></template>
    <RecurringForm :rule="null" page title-id="recurring-page-title" @close="back" />
  </FormPage>
</template>
