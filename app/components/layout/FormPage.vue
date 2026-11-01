<script setup lang="ts">
import Toaster from '@/components/base/Toaster.vue';
import IosAlert from '@/components/ios/IosAlert.vue';

// Halaman form di HP (mockup .form): masuk dari bawah lewat plugin
// page-transition (320ms), keluar ke bawah 200ms. Bar atas: "Batal" di kiri,
// judul di tengah, slot #action di kanan. Tidak bisa digeser dari tepi karena
// bukan halaman rincian. Tombol aksi form menempel di bawah
// (kelas .form-page-actions). Dipakai dengan definePageMeta({ layout: false }).
defineProps<{ title: string; titleId: string }>();
const emit = defineEmits<{ back: [] }>();
</script>

<template>
  <div data-page-stage class="flex min-h-dvh flex-col bg-background">
    <header
      class="sticky top-0 z-30 bg-card pt-[env(safe-area-inset-top,0px)] shadow-[0_0.5px_0_var(--sep)]"
    >
      <div class="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-1">
        <button
          type="button"
          class="h-11 justify-self-start px-3 text-bar text-primary-accent active:opacity-50"
          @click="emit('back')"
        >
          Batal
        </button>
        <h1 :id="titleId" class="m-0 truncate text-bar font-semibold tracking-[-0.02em]">
          {{ title }}
        </h1>
        <div class="flex justify-self-end">
          <slot name="action" />
        </div>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-3.5 pt-3.5">
      <slot />
    </main>
    <Toaster />
    <IosAlert />
  </div>
</template>
