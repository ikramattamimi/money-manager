<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';
import FormField from '@/components/base/FormField.vue';
import Switch from '@/components/base/Switch.vue';
import { Button } from '@/components/ui/button';
import type { AccountTotal } from '@/features/accounts/api';
import { useAccountMutations, useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';

// Tambah/ubah total akun: nama dan apakah total ini yang tampil di halaman
// Transaksi (saldo di kepala halaman, transaksi disaring ke akunnya). Menghapus
// total tidak menghapus akun: akunnya jadi tidak ikut total.
// `created` membawa total baru (atur total dari Pilih banyak).
const props = defineProps<{ total: AccountTotal | null; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: []; created: [total: AccountTotal] }>();

const { bookId } = useActiveBook();
const { accountTotals, totalById } = useAccounts();
const mutations = useAccountMutations();
const toast = useToast();

const form = reactive({
  name: props.total?.name ?? '',
  onTransactions: props.total?.on_transactions ?? false,
});
const error = ref('');
const saving = ref(false);
const members = computed(() =>
  props.total ? (totalById.value.get(props.total.id)?.accounts ?? []) : [],
);
const current = computed(() => (accountTotals.data.value ?? []).find((t) => t.on_transactions));

async function save() {
  if (saving.value || !bookId.value) return;
  const name = form.name.trim();
  const clash = (accountTotals.data.value ?? []).some(
    (t) => t.id !== props.total?.id && t.name.toLowerCase() === name.toLowerCase(),
  );
  error.value = !name ? 'Isi nama total.' : clash ? 'Sudah ada total dengan nama ini.' : '';
  if (error.value) return;

  const book = bookId.value;
  saving.value = true;
  try {
    let total = props.total;
    if (total) {
      await mutations.updateTotal.mutateAsync({ id: total.id, patch: { name } });
    } else {
      const sort = Math.max(-1, ...(accountTotals.data.value ?? []).map((t) => t.sort)) + 1;
      total = await mutations.createTotal.mutateAsync({ book_id: book, name, sort });
    }
    // Hanya satu total yang tampil di Transaksi: menyalakan ini mematikan yang lain
    if (form.onTransactions !== !!props.total?.on_transactions)
      await mutations.setTransactionsTotal.mutateAsync({
        bookId: book,
        id: form.onTransactions ? total.id : null,
      });
    toast.show(props.total ? 'Total disimpan' : `${name} ditambahkan`);
    if (!props.total) emit('created', total);
    emit('close');
  } catch {
    // Pesan sudah ditampilkan oleh mutasi
  } finally {
    saving.value = false;
  }
}

function remove() {
  if (!props.total || !bookId.value) return;
  mutations.deleteTotal.mutate(
    { id: props.total.id, bookId: bookId.value },
    { onSuccess: () => toast.show(`${props.total?.name ?? 'Total'} dihapus`) },
  );
  emit('close');
}
</script>

<template>
  <form class="flex flex-col gap-3.5" novalidate @submit.prevent="save">
    <div v-if="!page" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ total ? 'Ubah total' : 'Total baru' }}
      </h2>
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

    <FormField label="Nama total" for="total-name" :error="error">
      <input
        id="total-name"
        v-model="form.name"
        type="text"
        maxlength="60"
        class="field-input"
        autocomplete="off"
        placeholder="mis. Uang bulanan, Investasi, Dana darurat"
        :aria-invalid="!!error || undefined"
      />
    </FormField>

    <Switch
      id="total-on-transactions"
      v-model="form.onTransactions"
      label="Tampilkan di halaman Transaksi"
      :description="
        current && current.id !== total?.id
          ? `Menggantikan ${current.name}. Saldonya tampil di atas dan transaksi disaring ke akun di total ini.`
          : 'Saldonya tampil di atas dan transaksi disaring ke akun di total ini.'
      "
    />

    <div :class="['flex flex-wrap items-center gap-2 pt-1', page && 'form-page-actions']">
      <Button v-if="total" type="button" variant="ghost" size="touch" @click="remove">
        <Trash2 />Hapus
      </Button>
      <span class="flex-1" />
      <Button type="submit" size="touch" :disabled="saving">{{
        total ? 'Simpan perubahan' : 'Tambah total'
      }}</Button>
    </div>
    <p v-if="total && members.length" class="m-0 -mt-1.5 text-xs text-muted-foreground">
      Berisi {{ members.length }} akun. Kalau dihapus, akunnya tetap ada tapi tidak ikut total mana
      pun.
    </p>
  </form>
</template>
