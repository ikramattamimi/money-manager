import type { TxType } from './api';

interface Choice {
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
}

const KEY = 'mm-last-choice';

/**
 * Akun dan kategori terakhir per jenis transaksi, disimpan per perangkat.
 * Dipakai sebagai nilai awal form catat transaksi.
 */
export function useLastChoice() {
  const state = useState<Partial<Record<TxType, Choice>>>('tx:last-choice', () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      return {};
    }
  });

  function get(type: TxType): Choice {
    return state.value[type] ?? { accountId: null, toAccountId: null, categoryId: null };
  }

  function remember(type: TxType, choice: Choice) {
    state.value = { ...state.value, [type]: choice };
    try {
      localStorage.setItem(KEY, JSON.stringify(state.value));
    } catch {
      // Mode privat: cukup diingat sampai app ditutup
    }
  }

  return { get, remember };
}
