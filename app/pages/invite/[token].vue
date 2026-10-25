<script setup lang="ts">
import { BookOpen, CircleAlert, LogOut } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Toaster from '@/components/base/Toaster.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useAuth } from '@/features/auth/useAuth';
import { booksApi } from '@/features/books/api';
import { bookKeys } from '@/features/books/keys';
import { useActiveBook } from '@/features/books/useActiveBook';
import { ROLE_HINT, ROLE_LABEL } from '@/features/books/useBookAdmin';

// Terima undangan buku. Login dulu (middleware) dengan email yang diundang;
// kalau beda akun, tampilkan pesan yang jelas, bukan error.
definePageMeta({ layout: false });
useHead({ title: 'Undangan · Money Manager' });

const route = useRoute();
const token = String(route.params.token);
const auth = useAuth();
const client = useQueryClient();
const { setActiveBook } = useActiveBook();
const toast = useToast();

const preview = useQuery({
  queryKey: bookKeys.preview(token),
  queryFn: () => booksApi.preview(token),
  retry: false,
});
const invite = computed(() => preview.data.value ?? null);

const accepting = ref(false);
const acceptError = ref('');
async function accept() {
  accepting.value = true;
  acceptError.value = '';
  try {
    const bookId = await booksApi.accept(token);
    await client.invalidateQueries({ queryKey: bookKeys.all });
    setActiveBook(bookId);
    toast.show(`Selamat datang di buku ${invite.value?.book_name ?? ''}`);
    await navigateTo('/', { replace: true });
  } catch (error) {
    acceptError.value = (error as Error).message;
  } finally {
    accepting.value = false;
  }
}

async function switchAccount() {
  await auth.signOut();
  await navigateTo({ path: '/login', query: { next: route.fullPath } }, { replace: true });
}
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-background px-4 py-10">
    <Card class="flex w-full max-w-[420px] flex-col items-center gap-4 px-5 py-8 text-center">
      <template v-if="preview.isPending.value">
        <p class="m-0 text-meta text-muted-foreground">Membuka undangan…</p>
      </template>

      <template v-else-if="!invite">
        <ToneIcon :icon="CircleAlert" tone="warn" />
        <div class="flex flex-col gap-1">
          <b class="text-panel">Undangan tidak ditemukan</b>
          <p class="m-0 text-meta text-muted-foreground">
            Link-nya mungkin salah atau undangannya sudah dibatalkan. Minta pemilik buku mengirim
            ulang.
          </p>
        </div>
        <Button variant="secondary" size="touch" @click="navigateTo('/')">Buka app</Button>
      </template>

      <template v-else>
        <ToneIcon :icon="BookOpen" tone="primary" />
        <div class="flex flex-col gap-1">
          <span class="text-meta text-muted-foreground"
            >{{ invite.invited_by_name }} mengundangmu ke buku</span
          >
          <b class="text-[22px] font-bold">{{ invite.book_name }}</b>
          <span class="text-meta">
            sebagai <b>{{ ROLE_LABEL[invite.role] }}</b
            >: {{ ROLE_HINT[invite.role].toLowerCase() }}.
          </span>
        </div>

        <p
          v-if="invite.status === 'accepted'"
          class="m-0 rounded-xl bg-surface-2 px-3 py-2 text-meta"
        >
          Undangan ini sudah diterima.
        </p>
        <p
          v-else-if="invite.status === 'expired'"
          class="m-0 rounded-xl bg-warn-soft px-3 py-2 text-meta text-warn"
        >
          Undangan sudah kedaluwarsa. Minta {{ invite.invited_by_name }} mengirim ulang.
        </p>
        <template v-else-if="!invite.for_me">
          <p class="m-0 rounded-xl bg-warn-soft px-3 py-2 text-meta text-warn" role="alert">
            Undangan ini untuk <b>{{ invite.email_hint }}</b
            >, sedangkan kamu masuk sebagai <b>{{ auth.user.value?.email }}</b
            >. Masuk dengan email yang diundang untuk menerimanya.
          </p>
          <Button variant="secondary" size="touch" @click="switchAccount"
            ><LogOut />Masuk dengan email lain</Button
          >
        </template>
        <template v-else>
          <Button size="touch" class="w-full" :disabled="accepting" @click="accept">
            {{ accepting ? 'Menerima…' : 'Terima undangan' }}
          </Button>
          <p v-if="acceptError" class="m-0 text-meta text-bad" role="alert">{{ acceptError }}</p>
        </template>

        <Button
          v-if="invite.status !== 'open'"
          variant="ghost"
          size="touch"
          @click="navigateTo('/')"
          >Buka app</Button
        >
      </template>
    </Card>
    <Toaster />
  </main>
</template>
