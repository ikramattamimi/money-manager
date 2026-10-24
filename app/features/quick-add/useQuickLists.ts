import { useAccounts } from '@/features/accounts/useAccounts';
import { asTone, categoryIcon } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';
import type { QuickAccount, QuickCategory } from './types';

/** Akun dan kategori yang dikenali ketikan cepat ("kopi 25rb gopay") */
export function useQuickLists() {
  const { active } = useAccounts();
  const categories = useCategories();

  // Akun dikenali dari nama lengkap, dan kata pertamanya kalau tidak dipakai akun lain
  const accounts = computed<QuickAccount[]>(() => {
    const firstWords = active.value.map((a) => a.name.toLowerCase().split(/[\s·-]+/)[0]!);
    return active.value.map((a, i) => {
      const full = a.name.toLowerCase();
      const first = firstWords[i]!;
      const unique = firstWords.filter((w) => w === first).length === 1;
      return { id: a.id, name: a.name, aliases: [...new Set([full, ...(unique ? [first] : [])])] };
    });
  });

  // Kata kunci awal dari nama kategori; fase 6 menambah saran dari riwayat
  const quickCategories = computed<QuickCategory[]>(() =>
    (categories.data.value ?? [])
      .filter((c) => !c.archived)
      .map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        icon: categoryIcon(c.icon),
        tone: asTone(c.tone),
        keywords: c.name
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 3),
      })),
  );

  return { accounts, categories: quickCategories };
}
