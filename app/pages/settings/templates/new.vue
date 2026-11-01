<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';
import TemplateForm from '@/components/money/TemplateForm.vue';

// Bookmark baru sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Bookmark baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/settings/templates');
</script>

<template>
  <FormPage title="Bookmark baru" title-id="template-page-title" @back="back">
    <template #action><FormPageSave form="template-page-title-form" /></template>
    <TemplateForm :template="null" page title-id="template-page-title" @close="back" />
  </FormPage>
</template>
