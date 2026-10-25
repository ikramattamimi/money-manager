<script setup lang="ts">
import { Tag, Trash2, Wallet, X } from '@lucide/vue';
import Overlay from '@/components/base/Overlay.vue';
import GridPicker from '@/components/data/GridPicker.vue';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/features/transactions/api';
import {
  useBulkTransactions,
  useTxSelection,
  type BulkPatch,
} from '@/features/transactions/useBulk';
import { usePickerItems } from '@/features/transactions/usePickerItems';

// Bilah aksi massal di daftar transaksi: ubah kategori, ubah akun, hapus.
// Menempel di atas tab bar (HP) atau di bawah daftar (layar lebar).
const props = defineProps<{ list: Transaction[] }>();

const selection = useTxSelection();
const bulk = useBulkTransactions();
const pickerItems = usePickerItems();
const toast = useToast();

const chosen = computed(() => props.list.filter((t) => selection.has(t.id)));
const allSelected = computed(
  () => !!props.list.length && props.list.every((t) => selection.has(t.id)),
);
function toggleAll() {
  selection.selected.value = allSelected.value ? [] : props.list.map((t) => t.id);
}

// ---------- pilihan kategori / akun ----------
const picker = ref<'category' | 'account' | null>(null);
const open = computed({
  get: () => picker.value !== null,
  set: (v) => !v && (picker.value = null),
});
/** Kategori pemasukan dan pengeluaran berbeda: pakai jenis yang paling banyak dipilih */
const kind = computed<'income' | 'expense'>(() => {
  const income = chosen.value.filter((t) => t.type === 'income' && !t.is_adjustment).length;
  const expense = chosen.value.filter((t) => t.type === 'expense' && !t.is_adjustment).length;
  return income > expense ? 'income' : 'expense';
});
const items = computed(() =>
  picker.value === 'category' ? pickerItems.categoryItems(kind.value) : pickerItems.accountItems(),
);

function apply(patch: BulkPatch, list: Transaction[]) {
  bulk.update.mutate({ list, patch }, { onSuccess: () => selection.stop() });
}
function choose(id: string) {
  const which = picker.value;
  picker.value = null;
  if (which === 'category') {
    const list = chosen.value.filter((t) => t.type === kind.value);
    const other = chosen.value.length - list.length;
    if (other) toast.show(`${other} transaksi lain jenis/transfer tidak diubah kategorinya`);
    apply({ category_id: id || null }, list);
  } else if (which === 'account') {
    apply({ account_id: id }, chosen.value);
  }
}

// Hapus dua langkah supaya tidak terhapus tidak sengaja (ada Urungkan juga)
const confirmDelete = ref(false);
watch(chosen, () => (confirmDelete.value = false));
function remove() {
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  bulk.remove.mutate(chosen.value, { onSuccess: () => selection.stop() });
}
const busy = computed(() => bulk.update.isPending.value || bulk.remove.isPending.value);
</script>

<template>
  <div
    class="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+86px)] z-10 mt-4 flex flex-col gap-2 rounded-card border bg-card px-3.5 py-2.5 shadow-card md:bottom-4"
    role="toolbar"
    aria-label="Aksi untuk transaksi terpilih"
  >
    <div class="flex items-center gap-2">
      <span class="flex-1 text-meta">
        <b class="tabular-nums">{{ chosen.length }}</b> dipilih
      </span>
      <Button variant="ghost" size="sm" @click="toggleAll">
        {{ allSelected ? 'Batal pilih semua' : 'Pilih semua' }}
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Selesai memilih" @click="selection.stop()">
        <X />
      </Button>
    </div>
    <div class="grid grid-cols-3 gap-2">
      <Button :disabled="!chosen.length || busy" @click="picker = 'category'">
        <Tag />Kategori
      </Button>
      <Button variant="secondary" :disabled="!chosen.length || busy" @click="picker = 'account'">
        <Wallet />Akun
      </Button>
      <Button
        :variant="confirmDelete ? 'destructive' : 'ghost-danger'"
        :disabled="!chosen.length || busy"
        @click="remove"
      >
        <Trash2 />{{ confirmDelete ? 'Yakin?' : 'Hapus' }}
      </Button>
    </div>

    <Overlay v-model:open="open" labelledby="bulk-picker-title">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <h2 id="bulk-picker-title" class="m-0 flex-1 text-panel font-bold">
            {{
              picker === 'category'
                ? `Kategori ${kind === 'income' ? 'pemasukan' : 'pengeluaran'}`
                : 'Akun'
            }}
            untuk {{ chosen.length }} transaksi
          </h2>
          <Button variant="ghost" size="icon" aria-label="Tutup" @click="picker = null">
            <X />
          </Button>
        </div>
        <div class="max-h-[55dvh] overflow-y-auto overscroll-contain rounded-[10px]" data-no-drag>
          <GridPicker
            v-if="picker"
            :key="picker + kind"
            :items="items"
            model-value="__none__"
            :label="picker === 'category' ? 'Pilih kategori' : 'Pilih akun'"
            @select="choose"
          />
        </div>
      </div>
    </Overlay>
  </div>
</template>
