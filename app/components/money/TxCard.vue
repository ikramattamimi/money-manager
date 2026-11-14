<script setup lang="ts">
import { Camera, FileText, Zap } from '@lucide/vue';
import { parseQuick } from '@/features/quick-add/parser';
import type { Draft } from '@/features/quick-add/types';
import { useQuickAddSource, useQuickAddUi } from '@/features/quick-add/useQuickAdd';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import TransactionForm from './TransactionForm.vue';

// Kartu Catat di kolom kanan halaman Transaksi (desktop). Form baru yang
// selalu terbuka; tambah/ubah transaksi diisi di sini, bukan di dialog.
// Ketik cepat disembunyikan secara bawaan; tombol ⚡ di kepala kartu atau
// pintasan N memunculkannya. Teks diurai langsung ke baris, Enter menyimpan.
const editor = useTxEditor();
const ui = useQuickAddUi();
const source = useQuickAddSource();

onMounted(() => (editor.docked.value = true));
onBeforeUnmount(() => (editor.docked.value = false));

const text = ref('');
const input = ref<HTMLInputElement>();
const form = ref<InstanceType<typeof TransactionForm>>();

// Pilihan tampil/sembunyi diingat per perangkat
const QUICK_KEY = 'mm:card-quick';
const quickOpen = ref(false);
onMounted(() => {
  try {
    quickOpen.value = localStorage.getItem(QUICK_KEY) === '1';
  } catch {
    /* penyimpanan tidak tersedia: tetap tersembunyi */
  }
});
watch(quickOpen, (open) => {
  try {
    localStorage.setItem(QUICK_KEY, open ? '1' : '0');
  } catch {
    /* abaikan */
  }
});

function toggleQuick() {
  quickOpen.value = !quickOpen.value;
  if (quickOpen.value) nextTick(() => input.value?.focus());
  else text.value = '';
}

const quickDraft = computed<Draft | null>(() => {
  if (!quickOpen.value || !text.value.trim()) return null;
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

// Tombol "Catat transaksi" / pintasan N: kembali ke Catat baru, buka dan fokus Ketik cepat
watch(ui.focusTick, () => {
  if (editor.transaction.value) onClose();
  quickOpen.value = true;
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
    <template v-if="!editor.transaction.value" #actions>
      <button
        type="button"
        :aria-label="quickOpen ? 'Sembunyikan Ketik cepat' : 'Tampilkan Ketik cepat'"
        :aria-pressed="quickOpen"
        :title="quickOpen ? 'Sembunyikan Ketik cepat' : 'Ketik cepat, struk, mutasi (N)'"
        :class="[
          'grid size-10 place-items-center rounded-xl active:scale-90 active:bg-fill-press',
          quickOpen ? 'bg-primary-soft text-primary-accent' : 'text-primary-accent',
        ]"
        @click="toggleQuick"
      >
        <Zap class="size-5" :fill="quickOpen ? 'currentColor' : 'none'" aria-hidden="true" />
      </button>
    </template>
    <template v-if="!editor.transaction.value && quickOpen" #quick>
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
          @keydown.esc.prevent="toggleQuick"
        />
      </label>
      <!-- Cara catat lain: impor dari foto struk atau mutasi bank -->
      <div class="-mt-1 mb-2 flex shrink-0 gap-2 px-3">
        <NuxtLink
          to="/settings/import/photo"
          class="inline-flex h-8 items-center gap-1.5 rounded-full bg-fill px-3 text-meta font-semibold active:scale-95"
        >
          <Camera class="size-4" aria-hidden="true" />Struk
        </NuxtLink>
        <NuxtLink
          to="/settings/import/bank"
          class="inline-flex h-8 items-center gap-1.5 rounded-full bg-fill px-3 text-meta font-semibold active:scale-95"
        >
          <FileText class="size-4" aria-hidden="true" />Mutasi bank
        </NuxtLink>
      </div>
    </template>
  </TransactionForm>
</template>
