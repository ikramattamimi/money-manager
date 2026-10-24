<script setup lang="ts">
import { Zap } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import FormPage from '@/components/layout/FormPage.vue';
import TemplateForm from '@/components/money/TemplateForm.vue';
import { useTemplates } from '@/features/templates/useTemplates';

// Ubah template sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ubah template · Money Manager' });

const route = useRoute();
const templates = useTemplates();
const template = computed(
  () => templates.data.value?.find((t) => t.id === String(route.params.id)) ?? null,
);

const { closePage } = useFormPage();
const back = () => closePage('/settings/templates');
</script>

<template>
  <FormPage title="Ubah template" title-id="template-page-title" @back="back">
    <Skeleton v-if="templates.isPending.value" :rows="4" />
    <TemplateForm
      v-else-if="template"
      :key="template.id"
      :template="template"
      page
      class="flex-1"
      title-id="template-page-title"
      @close="back"
    />
    <Card v-else><EmptyState :icon="Zap" title="Template tidak ditemukan" /></Card>
  </FormPage>
</template>
