import type { Transaction } from './api';

export type TxFilterKind = 'income' | 'expense' | 'account';

export interface TxFilter {
  kind: TxFilterKind;
  /** Kategori utama (Masuk/Keluar) atau akun yang tidak dicentang */
  off: string[];
}

/**
 * Filter daftar Transaksi (mockup Filter): satu jenis, dengan kategori utama
 * atau akun yang dikeluarkan. Bertahan saat pindah tab; null = tanpa filter.
 */
export function useTxFilter() {
  const applied = useState<TxFilter | null>('tx:filter', () => null);

  /** `rootOf` memetakan kategori ke kategori utamanya */
  function apply<T extends Pick<Transaction, 'type' | 'category_id' | 'account_id'>>(
    list: T[],
    rootOf: (categoryId: string | null) => string | null,
    filter: TxFilter | null = applied.value,
  ): T[] {
    if (!filter) return list;
    if (filter.kind === 'account')
      return list.filter((t) => t.type !== 'transfer' && !filter.off.includes(t.account_id));
    return list.filter(
      (t) => t.type === filter.kind && !filter.off.includes(rootOf(t.category_id) ?? 'none'),
    );
  }

  return { applied, apply };
}
