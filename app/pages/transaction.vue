<script setup lang="ts">
import FormPage from '@/components/layout/FormPage.vue';
import TransactionForm from '@/components/money/TransactionForm.vue';
import { useTxEditor } from '@/features/transactions/useTxEditor';

// Form transaksi sebagai halaman penuh di HP (bukan modal), seperti Realbyte.
// Isian diambil dari useTxEditor; dibuka langsung = transaksi baru.
definePageMeta({ layout: false });

const editor = useTxEditor();
const title = computed(() =>
  editor.transaction.value?.is_adjustment
    ? 'Koreksi saldo'
    : editor.transaction.value
      ? 'Ubah transaksi'
      : 'Transaksi baru',
);
useHead({ title: () => `${title.value} · Money Manager` });
</script>

<template>
  <FormPage :title="title" title-id="tx-page-title" @back="editor.close()">
    <TransactionForm
      :key="editor.session.value"
      class="flex-1"
      layout="page"
      :transaction="editor.transaction.value"
      :draft="editor.draft.value"
      title-id="tx-page-title"
      @close="editor.close()"
    />
  </FormPage>
</template>
