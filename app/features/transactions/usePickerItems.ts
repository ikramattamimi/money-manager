import type { GridItem } from '@/components/data/GridPicker.vue';
import type { Account } from '@/features/accounts/api';
import { useAccounts } from '@/features/accounts/useAccounts';
import type { Category, CategoryKind } from '@/features/categories/api';
import { asTone, categoryIcon } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';

/** Isi GridPicker (gaya Realbyte) untuk kategori dan akun buku aktif */
export function usePickerItems() {
  const { grouped } = useAccounts();
  const categories = useCategories();

  /**
   * Kategori utama; yang punya sub membuka sub-nya, dengan sel pertama untuk
   * memilih induknya sendiri. `archived` = kategori lama transaksi yang diedit.
   */
  function categoryItems(kind: CategoryKind, archived?: Category | null): GridItem[] {
    const items: GridItem[] = categories.tree(kind).map((p) => {
      const style = { icon: categoryIcon(p.icon), tone: asTone(p.tone) };
      return {
        id: p.id,
        label: p.name,
        ...style,
        children: p.children.length
          ? [
              { id: p.id, label: p.name, hint: 'umum', ...style },
              ...p.children.map((c) => ({
                id: c.id,
                label: c.name,
                icon: categoryIcon(c.icon),
                tone: asTone(c.tone),
              })),
            ]
          : undefined,
      };
    });
    if (archived)
      items.push({
        id: archived.id,
        label: categories.label(archived.id, true),
        hint: 'diarsipkan',
        icon: categoryIcon(archived.icon),
        tone: asTone(archived.tone),
      });
    items.push({ id: '', label: 'Tanpa kategori' });
    return items;
  }

  /** Grup akun membuka akunnya. `exclude` = akun asal (untuk akun tujuan transfer) */
  function accountItems(exclude?: string | null, archived: Account[] = []): GridItem[] {
    const items: GridItem[] = grouped.value.map((g) => ({
      id: `group:${g.id}`,
      label: g.name,
      children: g.accounts.map((a) => ({ id: a.id, label: a.name, disabled: a.id === exclude })),
    }));
    if (archived.length)
      items.push({
        id: 'group:archived',
        label: 'Diarsipkan',
        children: archived.map((a) => ({ id: a.id, label: a.name, disabled: a.id === exclude })),
      });
    return items;
  }

  return { categoryItems, accountItems };
}
