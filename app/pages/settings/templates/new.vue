<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import TemplateForm from '@/components/money/TemplateForm.vue';

// Template baru sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Template baru · Money Manager' });

const { closePage } = useFormPage();
const back = () => closePage('/settings/templates');
</script>

<template>
  <FormPage title="Template baru" title-id="template-page-title" @back="back">
    <TemplateForm
      :template="null"
      page
      class="flex-1"
      title-id="template-page-title"
      @close="back"
    />
  </FormPage>
</template>
