<script setup lang="ts">
import EmptyCard from '@/components/ios/EmptyCard.vue';
import FormPage from '@/components/layout/FormPage.vue';
import CategoryForm from '@/components/money/CategoryForm.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';
import { useCategories } from '@/features/categories/useCategories';

// Ubah kategori sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Ubah kategori · Money Manager' });

const route = useRoute();
const categories = useCategories();
const category = computed(() => categories.byId.value.get(String(route.params.id)) ?? null);

const { closePage } = useFormPage();
const back = () => closePage('/settings/categories');
</script>

<template>
  <FormPage title="Ubah kategori" title-id="category-page-title" @back="back">
    <template v-if="category" #action><FormPageSave form="category-page-title-form" /></template>
    <CategoryForm
      v-if="category"
      :key="category.id"
      :category="category"
      :kind="category.kind"
      page
      title-id="category-page-title"
      @close="back"
    />
    <EmptyCard
      v-else
      :title="categories.isPending.value ? 'Memuat…' : 'Kategori tidak ditemukan'"
    />
  </FormPage>
</template>
