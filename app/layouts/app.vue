<script setup lang="ts">
import { Download, Repeat, Star } from '@lucide/vue';
import AppShell from '@/components/layout/AppShell.vue';
import TransactionEditor from '@/components/money/TransactionEditor.vue';
import { useAuth } from '@/features/auth/useAuth';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useProfile } from '@/features/profile/useProfile';
import { useTxEditor } from '@/features/transactions/useTxEditor';

// Layout aplikasi: AppShell dengan data buku aktif dari Supabase.
const auth = useAuth();
const { book, role, canEdit } = useActiveBook();
const editor = useTxEditor();

const ROLE_LABEL = { owner: 'Pemilik', editor: 'Editor', viewer: 'Hanya lihat' } as const;
const { displayName: userName, avatarUrl: userAvatar } = useProfile();

const extras = [
  { label: 'Bookmark', icon: Star, to: '/settings/templates' },
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
    :user-avatar="userAvatar"
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
