<script setup lang="ts">
import { Download, Repeat, Star } from '@lucide/vue';
import AppShell from '@/components/layout/AppShell.vue';
import { TEMPLATES } from '@/mocks/data';

// Layout katalog komponen (/prototype/ui, /prototype/tokens): AppShell dengan
// data tiruan, tanpa login. Tab bar menuju app asli.
// Fase 4 membuat layout `app` yang sama dengan sumber data Supabase.

const extras = [
  { label: 'Bookmark', icon: Star, count: TEMPLATES.length },
  { label: 'Berulang', icon: Repeat, count: 3 },
  { label: 'Impor', icon: Download },
];

useHead({ title: 'Prototipe · Money Manager' });
</script>

<template>
  <AppShell
    base=""
    book-name="Pribadi"
    user-name="ikra8520"
    user-role="Pemilik"
    :extras="extras"
    @logout="useToast().show('Prototipe: keluar tidak tersedia')"
  >
    <slot />
  </AppShell>
</template>
