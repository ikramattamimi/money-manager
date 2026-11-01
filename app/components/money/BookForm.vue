<script setup lang="ts">
import FieldRow from '@/components/data/FieldRow.vue';
import FormGroup from '@/components/data/FormGroup.vue';
import { FIELD_INPUT } from '@/components/data/field';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useBookMutations } from '@/features/books/useBookAdmin';
import FormDialogHeader from './FormDialogHeader.vue';

// Buku baru: kategori dan akun bawaan dibuat otomatis, lalu langsung dibuka.
// `page` = di dalam FormPage (Simpan di bar halaman, form id `${titleId}-form`);
// selain itu kepala Batal · judul · Buat sendiri (dialog iPad/desktop).
defineProps<{ titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: []; created: [id: string] }>();

const mutations = useBookMutations();
const { setActiveBook } = useActiveBook();
const toast = useToast();
const name = ref('');
const error = ref('');

function save() {
  error.value = name.value.trim() ? '' : 'Isi nama buku, mis. Rumah Tangga.';
  if (error.value || mutations.create.isPending.value) return;
  mutations.create.mutate(name.value.trim(), {
    onSuccess: (book) => {
      setActiveBook(book.id);
      toast.show(`Buku ${book.name} dibuat dan dibuka`);
      emit('created', book.id);
    },
  });
}
</script>

<template>
  <form
    :id="`${titleId}-form`"
    class="flex flex-col gap-3.5 pb-4"
    novalidate
    @submit.prevent="save"
  >
    <FormDialogHeader
      v-if="!page"
      title="Buku baru"
      :title-id="titleId"
      save-label="Buat"
      :disabled="mutations.create.isPending.value"
      @close="emit('close')"
    />
    <FormGroup
      :page="page"
      class="pt-2"
      foot="Buku terpisah dari buku lain: akun, kategori, dan transaksinya sendiri. Bisa dibagikan ke anggota keluarga."
    >
      <FieldRow label="Nama" for="book-name" :error="error" :label-width="64">
        <input
          id="book-name"
          v-model="name"
          type="text"
          maxlength="60"
          :class="FIELD_INPUT"
          autocomplete="off"
          placeholder="mis. Rumah Tangga, Usaha"
          :aria-invalid="!!error || undefined"
        />
      </FieldRow>
    </FormGroup>
  </form>
</template>
