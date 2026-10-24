<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue';
import Toaster from '@/components/base/Toaster.vue';

// Kerangka halaman form di HP: bar atas "‹ Kembali" + judul, isi di tengah,
// tombol aksi form menempel di bawah (kelas .form-page-actions).
// Dipakai dengan definePageMeta({ layout: false }).
defineProps<{ title: string; titleId: string }>();
const emit = defineEmits<{ back: [] }>();
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background">
    <header
      class="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center border-b bg-background/90 px-1.5 pb-1.5 pt-[calc(env(safe-area-inset-top,0px)+6px)] backdrop-blur"
    >
      <button
        type="button"
        class="press flex h-11 items-center gap-0.5 justify-self-start rounded-[10px] pl-1 pr-2.5 text-primary-accent"
        @click="emit('back')"
      >
        <ChevronLeft class="size-6" aria-hidden="true" />
        <span class="text-[17px]">Kembali</span>
      </button>
      <h1 :id="titleId" class="m-0 text-[17px] font-semibold">{{ title }}</h1>
      <span />
    </header>

    <main class="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-3.5 pt-3.5">
      <slot />
    </main>
    <Toaster />
  </div>
</template>
