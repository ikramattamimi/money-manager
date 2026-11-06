<script setup lang="ts">
import { BookOpen, CircleAlert } from '@lucide/vue';
import Toaster from '@/components/base/Toaster.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import IosButton from '@/components/ios/IosButton.vue';
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
  <main
    class="grid min-h-dvh place-items-center bg-background px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-[calc(env(safe-area-inset-top,0px)+24px)]"
  >
    <section
      class="flex w-full max-w-[400px] flex-col items-center gap-2.5 rounded-[20px] bg-card px-5 pb-6 pt-7 text-center"
    >
      <template v-if="preview.isPending.value">
        <span class="inv-spin mb-1.5" aria-hidden="true" />
        <p class="m-0 text-body text-muted-foreground" aria-live="polite">Membuka undangan…</p>
      </template>

      <template v-else-if="!invite">
        <ToneIcon :icon="CircleAlert" tone="amber" size="lg" solid class="mb-1" />
        <b class="text-sheet font-bold tracking-[-0.02em]">Undangan tidak ditemukan</b>
        <p class="m-0 max-w-[320px] text-label leading-[1.45] text-muted-foreground">
          Link-nya mungkin salah atau undangannya sudah dibatalkan. Minta pemilik buku mengirim
          ulang.
        </p>
        <IosButton block variant="gray" class="mt-1" to="/">Buka app</IosButton>
      </template>

      <template v-else>
        <span
          class="mb-1 grid size-16 place-items-center rounded-[18px] bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <BookOpen class="size-[30px]" stroke-width="1.9" />
        </span>
        <span class="text-meta text-muted-foreground"
          >{{ invite.invited_by_name }} mengundangmu ke buku</span
        >
        <b class="text-[24px] font-bold leading-[1.15] tracking-[-0.025em]">{{
          invite.book_name
        }}</b>
        <span class="text-label leading-[1.45]">
          sebagai <b>{{ ROLE_LABEL[invite.role] }}</b
          >: {{ ROLE_HINT[invite.role].toLowerCase() }}.
        </span>

        <p
          v-if="invite.status === 'accepted'"
          class="m-0 mt-1 self-stretch rounded-group bg-fill px-3 py-2.5 text-meta"
        >
          Undangan ini sudah diterima.
        </p>
        <p
          v-else-if="invite.status === 'expired'"
          class="m-0 mt-1 self-stretch rounded-group bg-warn-soft px-3 py-2.5 text-left text-meta leading-[1.45]"
        >
          Undangan sudah kedaluwarsa. Minta {{ invite.invited_by_name }} mengirim ulang.
        </p>
        <template v-else-if="!invite.for_me">
          <p
            class="m-0 mt-1 self-stretch rounded-group bg-warn-soft px-3 py-2.5 text-left text-meta leading-[1.45]"
            role="alert"
          >
            Undangan ini untuk <b>{{ invite.email_hint }}</b
            >, sedangkan kamu masuk sebagai <b>{{ auth.user.value?.email }}</b
            >. Masuk dengan email yang diundang untuk menerimanya.
          </p>
          <IosButton block variant="soft" class="mt-1" @click="switchAccount"
            >Masuk dengan email lain</IosButton
          >
        </template>
        <template v-else>
          <IosButton block class="mt-2" :disabled="accepting" @click="accept">
            {{ accepting ? 'Menerima…' : 'Terima undangan' }}
          </IosButton>
          <p v-if="acceptError" class="m-0 text-meta text-exp" role="alert">{{ acceptError }}</p>
        </template>

        <IosButton v-if="invite.status !== 'open'" block variant="gray" to="/">Buka app</IosButton>
      </template>
    </section>
    <Toaster />
  </main>
</template>

<style scoped>
.inv-spin {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid var(--fill-2);
  border-top-color: var(--primary-accent);
  animation: inv-spin 650ms linear infinite;
}
@keyframes inv-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
