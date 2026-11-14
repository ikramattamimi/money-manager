<script setup lang="ts">
import BottomSheet from '@/components/base/BottomSheet.vue';
import CenterDialog from '@/components/base/CenterDialog.vue';
import TransactionComposer from './TransactionComposer.vue';
import TransactionForm from './TransactionForm.vue';
import { useTxEditor } from '@/features/transactions/useTxEditor';

// Pembungkus form lengkap di iPad/desktop (HP memakai halaman /transaction).
// iPad landscape / desktop (>= 1024px): dialog dua kolom, panel di kanan.
// iPad portrait: sheet 640px dari bawah, panel menempel di bawah sheet.
// Di halaman Transaksi desktop form tampil di kartu kolom kanan (TxCard),
// dialog ini tidak dibuka. Form tetap dirender saat menutup supaya animasi
// keluar tidak kosong; :key membuat form baru setiap kali dibuka.
const editor = useTxEditor();
const { md, lg } = useBreakpoint();
const open = computed({
  get: () => editor.open.value,
  set: (v: boolean) => (editor.open.value = v),
});
const opened = ref(false);
watch(open, (v) => v && (opened.value = true));
</script>

<template>
  <CenterDialog v-if="lg" v-model:open="open" wide labelledby="tx-form-title">
    <TransactionForm
      v-if="opened"
      :key="editor.session.value"
      layout="split"
      :transaction="editor.transaction.value"
      :draft="editor.draft.value"
      title-id="tx-form-title"
      @close="editor.close()"
    />
  </CenterDialog>
  <BottomSheet v-else-if="md" v-model:open="open" form labelledby="tx-form-title">
    <TransactionForm
      v-if="opened"
      :key="editor.session.value"
      layout="portrait"
      :transaction="editor.transaction.value"
      :draft="editor.draft.value"
      title-id="tx-form-title"
      @close="editor.close()"
    />
  </BottomSheet>
  <BottomSheet v-else v-model:open="open" labelledby="tx-form-title">
    <TransactionComposer
      v-if="opened"
      :key="editor.session.value"
      :transaction="editor.transaction.value"
      :draft="editor.draft.value"
      title-id="tx-form-title"
      @close="editor.close()"
    />
  </BottomSheet>
</template>
