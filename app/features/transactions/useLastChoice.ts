import { useActiveBook } from '@/features/books/useActiveBook';
import type { TxType } from './api';

interface Choice {
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
}

const KEY = 'mm-last-choice';

type Store = Record<string, Partial<Record<TxType, Choice>>>;

/**
 * Akun dan kategori terakhir per jenis transaksi, per buku, disimpan per
 * perangkat. Dipakai sebagai nilai awal form catat transaksi.
 */
export function useLastChoice() {
  const { bookId } = useActiveBook();
  const state = useState<Store>('tx:last-choice', () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
      // Format lama (sebelum fase 9) tidak per buku: abaikan
      return raw && typeof raw === 'object' && !('expense' in raw || 'income' in raw) ? raw : {};
    } catch {
      return {};
    }
  });

  const empty: Choice = { accountId: null, toAccountId: null, categoryId: null };

  function get(type: TxType): Choice {
    return (bookId.value && state.value[bookId.value]?.[type]) || empty;
  }

  function remember(type: TxType, choice: Choice) {
    if (!bookId.value) return;
    state.value = {
      ...state.value,
      [bookId.value]: { ...state.value[bookId.value], [type]: choice },
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(state.value));
    } catch {
      // Mode privat: cukup diingat sampai app ditutup
    }
  }

  return { get, remember };
}
