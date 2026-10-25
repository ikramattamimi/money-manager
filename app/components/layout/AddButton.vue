<script setup lang="ts">
import { Plus } from '@lucide/vue';

// Tombol + Liquid Glass (HP dan iPad portrait). HP: mengambang di atas tab bar
// sisi kanan; iPad: kanan bawah (tab bar di atas). Hanya di tab Transaksi dan
// Akun. Di layar lebar, catat transaksi selalu terbuka di kolom kanan.
const emit = defineEmits<{ press: [] }>();
</script>

<template>
  <button
    type="button"
    aria-label="Catat transaksi"
    aria-haspopup="dialog"
    class="lg lg-tint press fixed bottom-[calc(env(safe-area-inset-bottom,0px)+86px)] right-3 z-40 grid size-14 place-items-center rounded-full md:bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] md:right-6 md:size-15 lg:hidden"
    @click="emit('press')"
  >
    <Plus class="size-6" stroke-width="2.4" aria-hidden="true" />
  </button>
</template>
