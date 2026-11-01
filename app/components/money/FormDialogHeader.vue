<script setup lang="ts">
// Kepala form saat tampil sebagai dialog/lembar (iPad, desktop, pilihan di
// halaman Akun): sama dengan bar FormPage di HP, "Batal" · judul · "Simpan".
// Simpan = tombol submit form tempat kepala ini berada.
withDefaults(
  defineProps<{ title: string; titleId: string; saveLabel?: string; disabled?: boolean }>(),
  { saveLabel: 'Simpan', disabled: false },
);
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="-mx-1 mb-1 grid h-11 grid-cols-[1fr_auto_1fr] items-center">
    <button
      type="button"
      class="h-11 justify-self-start px-2 text-bar text-primary-accent active:opacity-50"
      @click="emit('close')"
    >
      Batal
    </button>
    <h2 :id="titleId" class="m-0 truncate text-bar font-semibold tracking-[-0.02em]">
      {{ title }}
    </h2>
    <button
      type="submit"
      :disabled="disabled"
      class="h-11 justify-self-end px-2 text-bar font-semibold text-primary-accent active:opacity-50 disabled:opacity-40"
    >
      {{ saveLabel }}
    </button>
  </div>
</template>
