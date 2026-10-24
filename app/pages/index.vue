<script setup lang="ts">
import { WalletIcon } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format';
import { useSupabase } from '@/lib/supabase';

// Halaman uji fase 1: memastikan Tailwind, shadcn-vue, ikon, Supabase, dan
// server route tersambung. Diganti tab Transaksi di fase 4.
const supabaseStatus = ref('memeriksa…');
const { data: health } = await useFetch('/api/health');

onMounted(async () => {
  try {
    const { data, error } = await useSupabase().auth.getSession();
    if (error) throw error;
    supabaseStatus.value = data.session ? 'tersambung, sudah login' : 'tersambung, belum login';
  } catch (e) {
    supabaseStatus.value = e instanceof Error ? e.message : String(e);
  }
});
</script>

<template>
  <main class="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
    <div class="flex items-center gap-3">
      <WalletIcon class="size-8 text-primary" />
      <h1 class="text-3xl font-bold tracking-tight">Money Manager</h1>
    </div>

    <p class="text-4xl font-semibold tracking-tight tabular-nums">{{ formatRupiah(1250000) }}</p>

    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-card p-4 text-sm">
      <dt class="text-muted-foreground">Supabase</dt>
      <dd>{{ supabaseStatus }}</dd>
      <dt class="text-muted-foreground">Server</dt>
      <dd>{{ health?.status ?? 'tidak tersambung' }}</dd>
    </dl>

    <Button size="lg">Tambah transaksi</Button>
  </main>
</template>
