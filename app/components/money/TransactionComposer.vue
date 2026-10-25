<script setup lang="ts">
import { Camera, FileText, PenLine, X } from '@lucide/vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import { Button } from '@/components/ui/button';
import type { Draft } from '@/features/quick-add/types';
import type { Transaction } from '@/features/transactions/api';
import StatementImport from './StatementImport.vue';
import TransactionForm from './TransactionForm.vue';

// Tambah transaksi dengan tiga cara: isi manual, foto struk (dibaca AI), atau
// PDF mutasi bank. Mengubah transaksi selalu langsung ke form manual.
// Form manual tetap terpasang saat pindah tab supaya isiannya tidak hilang.
const props = withDefaults(
  defineProps<{
    transaction: Transaction | null;
    draft: Draft | null;
    titleId: string;
    layout?: 'dialog' | 'page';
  }>(),
  { layout: 'dialog' },
);
const emit = defineEmits<{ close: [] }>();

type Mode = 'manual' | 'photo' | 'pdf';
const MODES = [
  { value: 'manual', label: 'Manual', icon: PenLine },
  { value: 'photo', label: 'Struk', icon: Camera },
  { value: 'pdf', label: 'Mutasi', icon: FileText },
] as const;
const mode = ref<Mode>('manual');

const title = computed(() =>
  props.transaction?.is_adjustment
    ? 'Koreksi saldo'
    : props.transaction
      ? 'Ubah transaksi'
      : 'Transaksi baru',
);
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div v-if="layout === 'dialog'" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">{{ title }}</h2>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Tutup"
        class="press-icon"
        type="button"
        @click="emit('close')"
      >
        <X />
      </Button>
    </div>

    <!-- iPad/desktop: Struk dan Mutasi ada di panel Catat (samping), bukan di dialog ini -->
    <SegmentedControl
      v-if="!transaction && layout === 'page'"
      v-model="mode"
      :options="MODES"
      label="Cara mencatat"
    />

    <TransactionForm
      v-show="mode === 'manual'"
      :class="layout === 'page' && 'flex-1'"
      :layout="layout"
      :transaction="transaction"
      :draft="draft"
      :title-id="titleId"
      bare
      @close="emit('close')"
    />
    <StatementImport
      v-if="mode !== 'manual'"
      :key="mode"
      :source="mode"
      embedded
      @done="emit('close')"
    />
  </div>
</template>
