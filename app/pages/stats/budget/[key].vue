<script setup lang="ts">
import { PiggyBank } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import FormPage from '@/components/layout/FormPage.vue';
import BudgetForm from '@/components/money/BudgetForm.vue';
import { useBudgetMonth } from '@/features/budgets/useBudgetMonth';
import { useBudgetStatus } from '@/features/budgets/useBudgets';

// Ubah budget sebagai halaman penuh di HP. /stats/budget/total atau
// /stats/budget/<id kategori>, ?month=2026-10
definePageMeta({ layout: false });
useHead({ title: 'Ubah budget · Money Manager' });

const route = useRoute();
const { ym, year, month } = useBudgetMonth();
const fromQuery = String(route.query.month ?? '').match(/^(\d{4})-(\d{2})$/);
if (fromQuery) ym.value = { year: Number(fromQuery[1]), month: Number(fromQuery[2]) };
const { query, views } = useBudgetStatus(year, month);

const key = computed(() => String(route.params.key));
const budget = computed(
  () => views.value.find((v) => (v.category_id ?? 'total') === key.value) ?? null,
);

const { closePage } = useFormPage();
const back = () => closePage('/stats/budget');
</script>

<template>
  <FormPage title="Ubah budget" title-id="budget-page-title" @back="back">
    <Skeleton v-if="query.isPending.value" :rows="3" />
    <BudgetForm
      v-else-if="budget"
      :key="budget.budget_id"
      :budget="budget"
      :year="year"
      :month="month"
      :taken="views.map((v) => v.category_id)"
      page
      class="flex-1"
      title-id="budget-page-title"
      @close="back"
    />
    <Card v-else><EmptyState :icon="PiggyBank" title="Budget tidak ditemukan" /></Card>
  </FormPage>
</template>
