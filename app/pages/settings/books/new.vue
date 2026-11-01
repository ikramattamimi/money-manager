<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import BookForm from '@/components/money/BookForm.vue';
import FormPageSave from '@/components/money/FormPageSave.vue';

// Buku baru sebagai halaman penuh di HP (iPad/desktop: dialog)
definePageMeta({ layout: false });
useHead({ title: 'Buku baru · Money Manager' });

const { closePage } = useFormPage();
</script>

<template>
  <FormPage title="Buku baru" title-id="book-page-title" @back="closePage('/settings/books')">
    <template #action><FormPageSave form="book-page-title-form" label="Buat" /></template>
    <BookForm
      page
      title-id="book-page-title"
      @close="closePage('/settings/books')"
      @created="(id) => navigateTo(`/settings/books/${id}`, { replace: true })"
    />
  </FormPage>
</template>
