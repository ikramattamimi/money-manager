<script setup lang="ts">
import { Repeat } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import FormPage from '@/components/layout/FormPage.vue';
import RecurringForm from '@/components/money/RecurringForm.vue';
import { useRecurringRules } from '@/features/recurring/useRecurring';

// Ubah transaksi berulang sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ubah transaksi berulang · Money Manager' });

const route = useRoute();
const rules = useRecurringRules();
const rule = computed(
  () => rules.data.value?.find((r) => r.id === String(route.params.id)) ?? null,
);

const { closePage } = useFormPage();
const back = () => closePage('/settings/recurring');
</script>

<template>
  <FormPage title="Ubah berulang" title-id="recurring-page-title" @back="back">
    <Skeleton v-if="rules.isPending.value" :rows="5" />
    <RecurringForm
      v-else-if="rule"
      :key="rule.id"
      :rule="rule"
      page
      class="flex-1"
      title-id="recurring-page-title"
      @close="back"
    />
    <Card v-else><EmptyState :icon="Repeat" title="Aturan tidak ditemukan" /></Card>
  </FormPage>
</template>
