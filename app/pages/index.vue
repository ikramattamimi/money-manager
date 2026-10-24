<script setup lang="ts">
import { WalletIcon } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { useBooks } from '@/features/books/useBooks';

// Halaman sementara: memastikan login, RLS, dan Vue Query tersambung.
// Diganti tab Transaksi di fase 4.
const auth = useAuth();
const { data: books, isPending, error } = useBooks();
const { data: health } = await useFetch('/api/health');

const ROLE_LABEL = { owner: 'Pemilik', editor: 'Editor', viewer: 'Hanya lihat' } as const;

async function signOut() {
  await auth.signOut();
  await navigateTo('/login', { replace: true });
}
</script>

<template>
  <main class="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
    <div class="flex items-center gap-3">
      <WalletIcon class="size-8 text-primary" aria-hidden="true" />
      <h1 class="text-3xl font-bold tracking-tight">Money Manager</h1>
    </div>

    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-card p-4 text-sm">
      <dt class="text-muted-foreground">Masuk sebagai</dt>
      <dd class="truncate">{{ auth.user.value?.email }}</dd>
      <dt class="text-muted-foreground">Server</dt>
      <dd>{{ health?.status ?? 'tidak tersambung' }}</dd>
    </dl>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-medium text-muted-foreground">Buku</h2>
      <p v-if="isPending" class="text-sm text-muted-foreground">Memuat…</p>
      <p v-else-if="error" class="text-sm text-destructive">{{ error.message }}</p>
      <ul v-else class="divide-y divide-border rounded-xl bg-card">
        <li v-for="book in books" :key="book.id" class="flex justify-between px-4 py-3">
          <span>{{ book.name }}</span>
          <span class="text-muted-foreground">{{ book.role ? ROLE_LABEL[book.role] : '' }}</span>
        </li>
      </ul>
    </section>

    <Button variant="secondary" size="lg" @click="signOut">Keluar</Button>
  </main>
</template>
