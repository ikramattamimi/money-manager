<script setup lang="ts">
import { Zap } from '@lucide/vue';
import { parseQuick } from '@/features/quick-add/parser';
import type { Draft } from '@/features/quick-add/types';
import { useQuickAddSource, useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import TransactionForm from './TransactionForm.vue';

// Kartu Catat di kolom kanan halaman Transaksi (desktop). Form baru yang
// selalu terbuka; tambah/ubah transaksi diisi di sini, bukan di dialog.
// Ketik cepat di atas baris: teks diurai langsung ke baris di bawahnya,
// Enter menyimpan.
const editor = useTxEditor();
const ui = useQuickAddUi();
const source = useQuickAddSource();

onMounted(() => (editor.docked.value = true));
onBeforeUnmount(() => (editor.docked.value = false));

const text = ref('');
const input = ref<HTMLInputElement>();
const form = ref<InstanceType<typeof TransactionForm>>();

const quickDraft = computed<Draft | null>(() => {
  if (!text.value.trim()) return null;
  const p = parseQuick(text.value, {
    accounts: source.accounts.value,
    categories: source.categories.value,
  });
  return {
    type: p.type ?? 'expense',
    amount: p.amount,
    note: p.note,
    occurredAt: p.occurredAt,
    accountId: p.accountId,
    toAccountId: p.toAccountId,
    categoryId: p.categoryId,
  };
});
const draft = computed(() =>
  editor.transaction.value ? null : (quickDraft.value ?? editor.draft.value),
);

function submitQuick() {
  if (form.value?.canSave) form.value.save();
}

function onClose() {
  text.value = '';
  editor.close();
}

// Tombol "Catat transaksi" / pintasan N: kembali ke Catat baru, fokus ke Ketik cepat
watch(ui.focusTick, () => {
  if (editor.transaction.value) onClose();
  nextTick(() => input.value?.focus());
});
defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <TransactionForm
    ref="form"
    :key="editor.session.value"
    layout="card"
    :transaction="editor.transaction.value"
    :draft="draft"
    title-id="tx-card-title"
    @close="onClose"
  >
    <template v-if="!editor.transaction.value" #quick>
      <label
        class="mx-3 mb-2.5 mt-1 flex h-[42px] shrink-0 items-center gap-2 rounded-[11px] bg-fill px-3"
      >
        <Zap class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="sr-only">Ketik cepat</span>
        <input
          ref="input"
          v-model="text"
          type="text"
          autocomplete="off"
          enterkeyhint="done"
          placeholder="Ketik cepat: kopi 25rb gopay"
          class="h-full min-w-0 flex-1 bg-transparent text-amount outline-none placeholder:text-ter"
          @keydown.enter.prevent="submitQuick"
        />
      </label>
    </template>
  </TransactionForm>
</template>
