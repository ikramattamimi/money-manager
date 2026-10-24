<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import BudgetForm from '@/components/money/BudgetForm.vue';
import { useBudgetMonth } from '@/features/budgets/useBudgetMonth';
import { useBudgetStatus } from '@/features/budgets/useBudgets';

// Budget baru sebagai halaman penuh di HP (iPad/desktop: dialog). ?month=2026-10
definePageMeta({ layout: false });
useHead({ title: 'Budget baru · Money Manager' });

const route = useRoute();
const { ym, year, month } = useBudgetMonth();
const fromQuery = String(route.query.month ?? '').match(/^(\d{4})-(\d{2})$/);
if (fromQuery) ym.value = { year: Number(fromQuery[1]), month: Number(fromQuery[2]) };
const { views } = useBudgetStatus(year, month);

const { closePage } = useFormPage();
const back = () => closePage('/stats/budget');
</script>

<template>
  <FormPage title="Budget baru" title-id="budget-page-title" @back="back">
    <BudgetForm
      :budget="null"
      :year="year"
      :month="month"
      :taken="views.map((v) => v.category_id)"
      page
      class="flex-1"
      title-id="budget-page-title"
      @close="back"
    />
  </FormPage>
</template>
