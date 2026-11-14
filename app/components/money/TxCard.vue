<script setup lang="ts">
import { useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import TransactionForm from './TransactionForm.vue';

// Kartu Catat di kolom kanan halaman Transaksi (iPad landscape, desktop).
// Form selalu terbuka; tambah/ubah transaksi diisi di sini, bukan di dialog.
// Ketik cepat milik form (tombol ⚡); pintasan N / tombol "Catat transaksi"
// membukanya, termasuk teks dari Shortcut iOS (/add?text=…).
const editor = useTxEditor();
const ui = useQuickAddUi();
const prefill = useState('tx:prefill', () => '');
const form = ref<InstanceType<typeof TransactionForm>>();

onMounted(() => (editor.docked.value = true));
onBeforeUnmount(() => (editor.docked.value = false));

watch(ui.focusTick, () => {
  if (editor.transaction.value) editor.close();
  nextTick(() => {
    const text = prefill.value;
    prefill.value = '';
    form.value?.openQuick(text);
  });
});
</script>

<template>
  <TransactionForm
    ref="form"
    :key="editor.session.value"
    layout="card"
    :transaction="editor.transaction.value"
    :draft="editor.draft.value"
    title-id="tx-card-title"
    @close="editor.close()"
  />
</template>
