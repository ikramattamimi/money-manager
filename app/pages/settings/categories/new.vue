<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import CategoryForm from '@/components/money/CategoryForm.vue';
import type { CategoryKind } from '@/features/categories/api';

// Tambah kategori sebagai halaman penuh di HP (iPad/desktop: dialog).
// ?kind=income untuk kategori pemasukan.
definePageMeta({ layout: false });
useHead({ title: 'Kategori baru · Money Manager' });

const route = useRoute();
const kind = computed<CategoryKind>(() => (route.query.kind === 'income' ? 'income' : 'expense'));

const { closePage } = useFormPage();
const back = () => closePage('/settings/categories');
</script>

<template>
  <FormPage title="Kategori baru" title-id="category-page-title" @back="back">
    <CategoryForm
      :category="null"
      :kind="kind"
      page
      class="flex-1"
      title-id="category-page-title"
      @close="back"
    />
  </FormPage>
</template>
