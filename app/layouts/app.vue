<script setup lang="ts">
import { Download, Repeat, Zap } from '@lucide/vue';
import AppShell from '@/components/layout/AppShell.vue';
import TransactionEditor from '@/components/money/TransactionEditor.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useAuth } from '@/features/auth/useAuth';
import { useActiveBook } from '@/features/books/useActiveBook';
import { provideQuickAddSource } from '@/features/quick-add/useQuickAdd';
import { useQuickLists } from '@/features/quick-add/useQuickLists';
import type { Draft } from '@/features/quick-add/types';
import type { Transaction } from '@/features/transactions/api';
import { useLastChoice } from '@/features/transactions/useLastChoice';
import { useTransactionMutations } from '@/features/transactions/useTransactions';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { uuid } from '@/lib/uuid';

// Layout aplikasi: AppShell dengan data buku aktif dari Supabase.
const auth = useAuth();
const { book, bookId, role, canEdit } = useActiveBook();
const { active } = useAccounts();
const mutations = useTransactionMutations();
const last = useLastChoice();
const editor = useTxEditor();

const ROLE_LABEL = { owner: 'Pemilik', editor: 'Editor', viewer: 'Hanya lihat' } as const;
const userName = computed(() => auth.user.value?.email?.split('@')[0] ?? '');

const { accounts: quickAccounts, categories: quickCategories } = useQuickLists();

const defaultAccountId = computed(
  () => last.get('expense').accountId ?? active.value[0]?.id ?? null,
);

function save(draft: Draft) {
  if (!bookId.value || !draft.accountId) return null;
  const occurred = new Date();
  if (draft.date === 'yesterday') occurred.setDate(occurred.getDate() - 1);
  const input = {
    id: uuid(),
    book_id: bookId.value,
    type: draft.type,
    amount: draft.amount,
    occurred_at: occurred.toISOString(),
    account_id: draft.accountId,
    to_account_id: draft.type === 'transfer' ? draft.toAccountId : null,
    category_id: draft.type === 'transfer' ? null : draft.categoryId,
    note: draft.note ? draft.note[0]!.toUpperCase() + draft.note.slice(1) : '',
    source: 'quick_add' as const,
  };
  mutations.create.mutate(input);
  last.remember(draft.type, {
    accountId: draft.accountId,
    toAccountId: draft.toAccountId,
    categoryId: draft.categoryId,
  });
  return {
    label: formatRupiah(draft.amount),
    undo: () => mutations.remove.mutate({ ...input, fee: 0 } as Transaction),
  };
}

provideQuickAddSource({
  accounts: quickAccounts,
  categories: quickCategories,
  templates: ref([]),
  defaultAccountId,
  save,
  openFull: (draft) => editor.create(draft),
});

const extras = [
  { label: 'Template', icon: Zap },
  { label: 'Berulang', icon: Repeat },
  { label: 'Impor', icon: Download, to: '/settings/import' },
];

async function logout() {
  await auth.signOut();
  await navigateTo('/login', { replace: true });
}
</script>

<template>
  <AppShell
    base=""
    :book-name="book?.name ?? '…'"
    :user-name="userName"
    :user-role="role ? ROLE_LABEL[role] : ''"
    :extras="extras"
    :can-add="canEdit"
    :phone-add="() => editor.create()"
    @logout="logout"
  >
    <slot />
    <TransactionEditor />
  </AppShell>
</template>
