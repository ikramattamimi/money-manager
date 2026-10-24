<script setup lang="ts">
import { Download, Repeat, Zap } from '@lucide/vue';
import AppShell from '@/components/layout/AppShell.vue';
import { provideQuickAddSource } from '@/features/quick-add/useQuickAdd';
import type { QuickCategory } from '@/features/quick-add/types';
import { ACCOUNTS, CATEGORIES, TEMPLATES } from '@/mocks/data';
import { useMockLedger } from '@/mocks/useMockLedger';

// Layout layar prototipe (/prototype/*): AppShell dengan data tiruan.
// Fase 4 membuat layout `app` yang sama dengan sumber data Supabase.
const ledger = useMockLedger();

provideQuickAddSource({
  accounts: ref(ACCOUNTS.filter((a) => a.balance >= 0)),
  categories: ref(
    CATEGORIES.filter(
      (c): c is QuickCategory & typeof c => c.kind !== 'transfer',
    ) as QuickCategory[],
  ),
  templates: ref(TEMPLATES),
  defaultAccountId: ref('cash'),
  save: (draft) => ledger.add(draft),
});

const extras = [
  { label: 'Template', icon: Zap, count: TEMPLATES.length },
  { label: 'Berulang', icon: Repeat, count: 3 },
  { label: 'Impor', icon: Download },
];

useHead({ title: 'Prototipe · Money Manager' });
</script>

<template>
  <AppShell
    base="/prototype"
    book-name="Pribadi"
    user-name="ikra8520"
    user-role="Pemilik"
    :extras="extras"
    @logout="useToast().show('Prototipe: keluar tidak tersedia')"
  >
    <slot />
  </AppShell>
</template>
