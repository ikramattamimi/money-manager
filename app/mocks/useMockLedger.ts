import type { Draft } from '@/features/quick-add/types';
import { formatRupiah } from '@/lib/format';
import { ACCOUNTS, CATEGORIES, TODAY, TRANSACTIONS, type MockTx } from './data';

/**
 * Buku tiruan untuk layar prototipe: daftar transaksi yang bisa ditambah,
 * dihapus, dan dipulihkan (Urungkan). Hilang saat halaman dimuat ulang.
 */
export function useMockLedger() {
  const txs = useState<MockTx[]>('mock:txs', () => TRANSACTIONS.map((t) => ({ ...t })));
  /** Transaksi terakhir yang ditambah/dipulihkan, untuk disorot di daftar */
  const highlight = useState<string | null>('mock:highlight', () => null);

  const totals = computed(() =>
    txs.value.reduce(
      (s, t) => {
        if (t.type === 'income') s.income += t.amount;
        if (t.type === 'expense') s.expense += t.amount;
        return s;
      },
      { income: 0, expense: 0 },
    ),
  );

  const category = (id: string) => CATEGORIES.find((c) => c.id === id)!;
  const accountName = (id?: string) => ACCOUNTS.find((a) => a.id === id)?.name ?? '';

  function add(draft: Draft) {
    const date = new Date(TODAY);
    if (draft.occurredAt) date.setTime(new Date(draft.occurredAt).getTime());
    else date.setHours(new Date().getHours(), new Date().getMinutes());
    const categoryId =
      draft.type === 'transfer'
        ? 'transfer'
        : (draft.categoryId ?? (draft.type === 'income' ? 'salary' : 'shop'));
    const tx: MockTx = {
      id: `n${Date.now()}`,
      date,
      type: draft.type,
      amount: draft.amount,
      categoryId,
      note: draft.note
        ? draft.note[0]!.toUpperCase() + draft.note.slice(1)
        : category(categoryId).name,
      accountId: draft.accountId ?? 'cash',
      toAccountId: draft.toAccountId ?? undefined,
    };
    txs.value = [...txs.value, tx];
    highlight.value = tx.id;
    return {
      label: formatRupiah(tx.amount),
      undo: () => (txs.value = txs.value.filter((t) => t.id !== tx.id)),
    };
  }

  function remove(id: string) {
    const index = txs.value.findIndex((t) => t.id === id);
    if (index < 0) return null;
    const removed = txs.value[index]!;
    txs.value = txs.value.filter((t) => t.id !== id);
    return {
      note: removed.note,
      undo: () => {
        const next = [...txs.value];
        next.splice(index, 0, removed);
        txs.value = next;
        highlight.value = removed.id;
      },
    };
  }

  return { txs, totals, highlight, category, accountName, add, remove };
}
