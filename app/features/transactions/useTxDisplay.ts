import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useBookMembers } from '@/features/books/useBookAdmin';
import { ADJUSTMENT_STYLE, TRANSFER_STYLE } from '@/features/categories/icons';
import { useCategories } from '@/features/categories/useCategories';
import { formatRupiah } from '@/lib/format';
import { formatTime } from '@/lib/time';
import type { Transaction } from './api';

const SIGN = { income: '+', expense: '−', transfer: '' } as const;

/** Props TransactionRow untuk satu transaksi: ikon, judul, sub, nominal bertanda */
export function useTxDisplay() {
  const categories = useCategories();
  const accounts = useAccounts();
  const { bookId } = useActiveBook();
  const members = useBookMembers(bookId);
  // Buku bersama: nama pencatat untuk transaksi yang dicatat anggota lain
  const otherNames = computed(() => {
    const list = members.data.value ?? [];
    if (list.length < 2) return new Map<string, string>();
    return new Map(list.filter((m) => !m.is_me).map((m) => [m.user_id, m.display_name]));
  });

  function rowProps(t: Transaction, perspectiveAccountId?: string) {
    const style = t.is_adjustment
      ? ADJUSTMENT_STYLE
      : t.type === 'transfer'
        ? TRANSFER_STYLE
        : {
            ...categories.style(t.category_id),
            name: categories.label(t.category_id) || 'Tanpa kategori',
          };

    const subtitle =
      t.type === 'transfer'
        ? `${accounts.name(t.account_id)} → ${accounts.name(t.to_account_id)}` +
          (t.fee ? ` · biaya ${formatRupiah(t.fee)}` : '')
        : `${t.is_adjustment ? 'Koreksi saldo' : style.name} · ${accounts.name(t.account_id)}`;

    // Di detail akun, transfer dilihat dari sisi akun itu: keluar merah, masuk biru
    let kind: 'income' | 'expense' | 'transfer' = t.is_adjustment ? 'transfer' : t.type;
    let sign: string = SIGN[t.type];
    if (perspectiveAccountId && t.type === 'transfer') {
      const out = t.account_id === perspectiveAccountId;
      kind = out ? 'expense' : 'income';
      sign = out ? '−' : '+';
    }

    return {
      icon: style.icon,
      tone: style.tone,
      title: t.note || style.name,
      subtitle,
      amount: sign + formatRupiah(t.amount),
      kind,
      meta: [formatTime(t.occurred_at), t.created_by ? otherNames.value.get(t.created_by) : '']
        .filter(Boolean)
        .join(' · '),
    };
  }

  return { rowProps };
}
