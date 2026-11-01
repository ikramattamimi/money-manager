<script setup lang="ts">
// Tombol Simpan di slot #action FormPage (mockup .form: kanan atas, tebal
// aksen). Mengirim form lewat atribut `form`, karena form ada di isi halaman.
withDefaults(defineProps<{ form: string; label?: string }>(), { label: 'Simpan' });
</script>

<template>
  <button
    type="submit"
    :form="form"
    class="h-11 px-3 text-bar font-semibold text-primary-accent active:opacity-50"
  >
    {{ label }}
  </button>
</template>
