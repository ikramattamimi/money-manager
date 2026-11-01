<script setup lang="ts">
import EmptyCard from '@/components/ios/EmptyCard.vue';
import FormPage from '@/components/layout/FormPage.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';
import TemplateForm from '@/components/money/TemplateForm.vue';
import { useTemplates } from '@/features/templates/useTemplates';

// Ubah bookmark sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ubah bookmark · Money Manager' });

const route = useRoute();
const templates = useTemplates();
const template = computed(
  () => templates.data.value?.find((t) => t.id === String(route.params.id)) ?? null,
);

const { closePage } = useFormPage();
const back = () => closePage('/settings/templates');
</script>

<template>
  <FormPage title="Ubah bookmark" title-id="template-page-title" @back="back">
    <template v-if="template" #action><FormPageSave form="template-page-title-form" /></template>
    <TemplateForm
      v-if="template"
      :key="template.id"
      :template="template"
      page
      title-id="template-page-title"
      @close="back"
    />
    <EmptyCard v-else :title="templates.isPending.value ? 'Memuat…' : 'Bookmark tidak ditemukan'" />
  </FormPage>
</template>
