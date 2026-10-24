<script setup lang="ts">
import { Tag } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import FormPage from '@/components/layout/FormPage.vue';
import CategoryForm from '@/components/money/CategoryForm.vue';
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
    <Skeleton v-if="categories.isPending.value" :rows="4" />
    <CategoryForm
      v-else-if="category"
      :key="category.id"
      :category="category"
      :kind="category.kind"
      page
      class="flex-1"
      title-id="category-page-title"
      @close="back"
    />
    <Card v-else><EmptyState :icon="Tag" title="Kategori tidak ditemukan" /></Card>
  </FormPage>
</template>
