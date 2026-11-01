<script setup lang="ts">
import Toaster from '@/components/base/Toaster.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { TRANSFER_STYLE } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';
import type { Template } from '@/features/templates/api';
import { useTemplateMutations, useTemplates } from '@/features/templates/useTemplates';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';

// Bookmark (mockup bookmark; datanya tabel templates): modal dari menu tahan
// tombol +. Ketuk = form catat terisi dengan tanggal hari ini. Kelola (ubah,
// hapus, urutkan) lewat "Ubah" yang membuka Lainnya → Bookmark.
definePageMeta({ layout: false });
useHead({ title: 'Bookmark · Money Manager' });
if (useBreakpoint().md.value) setPageLayout('app');

const { closePage } = useFormPage();
const close = () => closePage('/');
const templates = useTemplates();
const mutations = useTemplateMutations();
const accounts = useAccounts();
const categories = useCategories();
const editor = useTxEditor();

const style = (t: Template) =>
  t.type === 'transfer' ? TRANSFER_STYLE : categories.style(t.category_id);
const caption = (t: Template) =>
  t.type === 'transfer'
    ? `${accounts.name(t.account_id)} → ${accounts.name(t.to_account_id)}`
    : [categories.label(t.category_id, true), accounts.name(t.account_id)]
        .filter(Boolean)
        .join(' · ');
const TONE = { income: 'text-inc', expense: 'text-exp', transfer: 'text-muted-foreground' };

function use(t: Template) {
  mutations.bump.mutate(t.id);
  editor.create({
    type: t.type,
    amount: t.amount ?? 0,
    accountId: t.account_id,
    toAccountId: t.to_account_id,
    categoryId: t.category_id,
    note: t.note,
    occurredAt: null,
  });
}
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
          @click="close"
        >
          Tutup
        </button>
        <h1 class="m-0 text-bar font-semibold tracking-[-0.02em]">Bookmark</h1>
        <NuxtLink
          to="/settings/templates"
          class="grid h-11 place-items-center justify-self-end px-3 text-bar font-semibold text-primary-accent active:opacity-50"
          >Ubah</NuxtLink
        >
      </div>
    </header>

    <main class="mx-auto w-full max-w-[640px] flex-1 pb-10">
      <p class="mx-8 mb-2 mt-3.5 text-meta text-muted-foreground">
        Ketuk untuk mencatat dengan isian yang sama, tanggalnya jadi hari ini.
      </p>
      <EmptyCard
        v-if="!templates.data.value?.length"
        :title="templates.isPending.value ? 'Memuat…' : 'Belum ada bookmark'"
        description="Buka transaksi yang sering dicatat, lalu ketuk Jadikan bookmark."
      />
      <div v-else class="mx-4 overflow-hidden rounded-group bg-card">
        <button
          v-for="t in templates.data.value"
          :key="t.id"
          type="button"
          class="bm-row flex min-h-14 w-full items-center gap-3 py-2 pl-4 pr-3.5 text-left active:bg-fill-press"
          @click="use(t)"
        >
          <ToneIcon :icon="style(t).icon" :tone="style(t).tone" />
          <span class="flex min-w-0 flex-1 flex-col">
            <b class="truncate text-row font-medium">{{ t.note || t.name }}</b>
            <span class="truncate text-meta text-muted-foreground">{{ caption(t) }}</span>
          </span>
          <span :class="['shrink-0 text-row font-semibold', TONE[t.type]]">{{
            t.amount ? formatRupiah(t.amount) : 'Isi nominal'
          }}</span>
        </button>
      </div>
    </main>
    <Toaster />
  </div>
</template>

<style scoped>
.bm-row {
  position: relative;
  transition: background-color 120ms ease;
}
.bm-row + .bm-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 64px;
  right: 0;
  height: 0.5px;
  background: var(--sep);
}
</style>
