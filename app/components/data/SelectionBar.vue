<script setup lang="ts">
import { X } from '@lucide/vue';
import { Button } from '@/components/ui/button';

// Bilah aksi untuk baris terpilih (akun, kategori): jumlah, pilih semua,
// tutup, lalu tombol aksi di slot. Menempel di atas tab bar di HP.
defineProps<{ count: number; total: number; label: string }>();
const emit = defineEmits<{ toggleAll: []; close: [] }>();
</script>

<template>
  <div
    class="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+86px)] z-10 mt-4 flex flex-col gap-2 rounded-card border bg-card px-3.5 py-2.5 shadow-card md:bottom-4"
    role="toolbar"
    :aria-label="label"
  >
    <div class="flex items-center gap-2">
      <span class="flex-1 text-meta"
        ><b class="tabular-nums">{{ count }}</b> dipilih</span
      >
      <Button variant="ghost" size="sm" @click="emit('toggleAll')">
        {{ count === total && total > 0 ? 'Batal pilih semua' : 'Pilih semua' }}
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Selesai memilih" @click="emit('close')">
        <X />
      </Button>
    </div>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <slot />
    </div>
  </div>
</template>
