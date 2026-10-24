<script setup lang="ts">
import BottomSheet from '@/components/base/BottomSheet.vue';
import CenterDialog from '@/components/base/CenterDialog.vue';
import TransactionForm from './TransactionForm.vue';
import { useTxEditor } from '@/features/transactions/useTxEditor';

// Pembungkus form lengkap: sheet bawah di HP, dialog di iPad dan desktop.
// Form tetap dirender saat menutup supaya animasi keluar tidak kosong;
// :key membuat form baru setiap kali dibuka.
const editor = useTxEditor();
const { md } = useBreakpoint();
const open = computed({
  get: () => editor.open.value,
  set: (v: boolean) => (editor.open.value = v),
});
const opened = ref(false);
watch(open, (v) => v && (opened.value = true));
</script>

<template>
  <component :is="md ? CenterDialog : BottomSheet" v-model:open="open" labelledby="tx-form-title">
    <TransactionForm
      v-if="opened"
      :key="editor.session.value"
      :transaction="editor.transaction.value"
      :draft="editor.draft.value"
      title-id="tx-form-title"
      @close="editor.close()"
    />
  </component>
</template>
