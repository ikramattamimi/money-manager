<script setup lang="ts">
import Toaster from '@/components/base/Toaster.vue';
import IosAlert from '@/components/ios/IosAlert.vue';
import TransactionForm from '@/components/money/TransactionForm.vue';
import { useTxEditor } from '@/features/transactions/useTxEditor';

// Form transaksi sebagai halaman penuh di HP (mockup form-*), masuk dari bawah
// lewat plugin page-transition. Bar atas (Batal · jenis · bintang) milik form.
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
  <div data-page-stage class="flex min-h-dvh flex-col bg-background">
    <TransactionForm
      :key="editor.session.value"
      class="mx-auto w-full max-w-[560px] flex-1"
      layout="page"
      :transaction="editor.transaction.value"
      :draft="editor.draft.value"
      title-id="tx-page-title"
      @close="editor.close()"
    />
    <Toaster />
    <IosAlert />
  </div>
</template>
