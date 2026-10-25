<script setup lang="ts">
import { X } from '@lucide/vue';
import FormField from '@/components/base/FormField.vue';
import { Button } from '@/components/ui/button';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useBookMutations } from '@/features/books/useBookAdmin';

// Buku baru: kategori dan akun bawaan dibuat otomatis, lalu langsung dibuka.
defineProps<{ titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: []; created: [id: string] }>();

const mutations = useBookMutations();
const { setActiveBook } = useActiveBook();
const toast = useToast();
const name = ref('');
const error = ref('');

function save() {
  error.value = name.value.trim() ? '' : 'Isi nama buku, mis. Rumah Tangga.';
  if (error.value) return;
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
  <form class="flex flex-col gap-3.5" novalidate @submit.prevent="save">
    <div v-if="!page" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">Buku baru</h2>
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
    <FormField
      label="Nama buku"
      for="book-name"
      :error="error"
      hint="Buku terpisah dari buku lain: akun, kategori, dan transaksinya sendiri. Bisa dibagikan ke anggota keluarga."
    >
      <input
        id="book-name"
        v-model="name"
        type="text"
        maxlength="60"
        class="field-input"
        autocomplete="off"
        placeholder="mis. Rumah Tangga, Usaha"
        :aria-invalid="!!error || undefined"
      />
    </FormField>
    <div :class="['flex justify-end pt-1', page && 'form-page-actions']">
      <Button type="submit" size="touch" :disabled="mutations.create.isPending.value"
        >Buat buku</Button
      >
    </div>
  </form>
</template>
