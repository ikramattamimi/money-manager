<script setup lang="ts">
import EmptyCard from '@/components/ios/EmptyCard.vue';
import FormPage from '@/components/layout/FormPage.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';
import RecurringForm from '@/components/money/RecurringForm.vue';
import { useRecurringRules } from '@/features/recurring/useRecurring';

// Ubah aturan ulangi sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ubah ulangi · Money Manager' });

const route = useRoute();
const rules = useRecurringRules();
const rule = computed(
  () => rules.data.value?.find((r) => r.id === String(route.params.id)) ?? null,
);

const { closePage } = useFormPage();
const back = () => closePage('/settings/recurring');
</script>

<template>
  <FormPage title="Ubah ulangi" title-id="recurring-page-title" @back="back">
    <template v-if="rule" #action><FormPageSave form="recurring-page-title-form" /></template>
    <RecurringForm
      v-if="rule"
      :key="rule.id"
      :rule="rule"
      page
      title-id="recurring-page-title"
      @close="back"
    />
    <EmptyCard v-else :title="rules.isPending.value ? 'Memuat…' : 'Aturan tidak ditemukan'" />
  </FormPage>
</template>
