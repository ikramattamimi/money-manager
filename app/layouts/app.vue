<script setup lang="ts">
import { Download, Repeat, Zap } from '@lucide/vue';
import AppShell from '@/components/layout/AppShell.vue';
import TransactionEditor from '@/components/money/TransactionEditor.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useAuth } from '@/features/auth/useAuth';
import { useActiveBook } from '@/features/books/useActiveBook';
import { provideQuickAddSource } from '@/features/quick-add/useQuickAdd';
import { useQuickLists } from '@/features/quick-add/useQuickLists';
import { useSuggest } from '@/features/quick-add/useSuggest';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import type { Draft, QuickTemplate } from '@/features/quick-add/types';
import type { Transaction } from '@/features/transactions/api';
import { useLastChoice } from '@/features/transactions/useLastChoice';
import type { Template } from '@/features/templates/api';
import { useTemplateMutations, useTemplates } from '@/features/templates/useTemplates';
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
const pickerItems = usePickerItems();

// Template: paling sering dipakai dulu. Bernominal = satu tap langsung tersimpan.
const templateQuery = useTemplates();
const templateMutations = useTemplateMutations();
const templateDraft = (t: Template): Draft => ({
  type: t.type,
  amount: t.amount ?? 0,
  accountId: t.account_id ?? defaultAccountId.value,
  toAccountId: t.to_account_id,
  categoryId: t.category_id,
  note: t.note,
  occurredAt: null,
});
const templates = computed<QuickTemplate[]>(() =>
  (templateQuery.data.value ?? []).map((t) => ({
    id: t.id,
    label: t.name,
    categoryId: t.category_id,
    draft: templateDraft(t),
  })),
);
function useTemplate(id: string) {
  const t = templateQuery.data.value?.find((x) => x.id === id);
  if (!t) return null;
  const draft = templateDraft(t);
  if (!draft.amount || !draft.accountId || (draft.type === 'transfer' && !draft.toAccountId))
    return 'needs-amount' as const;
  const result = save(draft, 'template');
  if (result) templateMutations.bump.mutate(t.id);
  return result;
}

const defaultAccountId = computed(
  () => last.get('expense').accountId ?? active.value[0]?.id ?? null,
);

function save(draft: Draft, source: 'quick_add' | 'template' = 'quick_add') {
  if (!bookId.value || !draft.accountId) return null;
  const occurred = draft.occurredAt ? new Date(draft.occurredAt) : new Date();
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
    source,
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
  templates,
  useTemplate,
  defaultAccountId,
  save,
  openFull: (draft) => editor.create(draft),
  useSuggest,
  pickerItems: {
    category: (kind) => pickerItems.categoryItems(kind),
    account: (exclude) => pickerItems.accountItems(exclude),
  },
});

const extras = [
  { label: 'Template', icon: Zap, to: '/settings/templates' },
  { label: 'Berulang', icon: Repeat, to: '/settings/recurring' },
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
