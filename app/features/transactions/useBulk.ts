import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { accountKeys } from '@/features/accounts/keys';
import { offsetsApi, transactionsApi, type Transaction } from './api';
import { transactionKeys } from './keys';
import { toInput } from './useTransactions';

/** Mode pilih banyak di daftar transaksi, bertahan selama tab dibuka */
export function useTxSelection() {
  // Kunci bersama: AppShell menyembunyikan tombol + selama mode pilih aktif
  const selecting = useState('ui:selecting', () => false);
  const selected = useState<string[]>('tx:selected', () => []);
  const has = (id: string) => selected.value.includes(id);
  function toggle(id: string) {
    selected.value = has(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id];
  }
  function stop() {
    selecting.value = false;
    selected.value = [];
  }
  return { selecting, selected, has, toggle, stop };
}

/** Bagian transaksi yang bisa diubah sekaligus */
export type BulkPatch = { category_id: string | null } | { account_id: string };

/**
 * Ubah/hapus banyak transaksi sekaligus, dengan Urungkan. Kategori hanya untuk
 * pemasukan/pengeluaran biasa (transfer dan koreksi saldo dilewati); akun
 * mengganti akun asal (untuk transfer: akun asalnya, kalau tidak sama dengan
 * akun tujuan).
 */
export function useBulkTransactions() {
  const client = useQueryClient();
  const toast = useToast();
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: transactionKeys.all }),
      client.invalidateQueries({ queryKey: accountKeys.all }),
    ]);

  /** Transaksi yang memang bisa menerima perubahan ini */
  function eligible(list: Transaction[], patch: BulkPatch) {
    if ('category_id' in patch)
      return list.filter((t) => t.type !== 'transfer' && !t.is_adjustment);
    return list.filter(
      (t) => t.to_account_id !== patch.account_id && t.account_id !== patch.account_id,
    );
  }

  const update = useMutation({
    mutationFn: async ({ list, patch }: { list: Transaction[]; patch: BulkPatch }) => {
      const targets = eligible(list, patch);
      await transactionsApi.updateMany(
        targets.map((t) => t.id),
        patch,
      );
      return { targets, skipped: list.length - targets.length, patch };
    },
    onSuccess: async ({ targets, skipped, patch }) => {
      await refresh();
      const field = 'category_id' in patch ? 'category_id' : 'account_id';
      // Urungkan: kembalikan nilai lama, dikelompokkan supaya satu panggilan per nilai
      const before = new Map<string | null, string[]>();
      for (const t of targets) before.set(t[field], [...(before.get(t[field]) ?? []), t.id]);
      toast.show(
        `${targets.length} transaksi diubah${skipped ? ` · ${skipped} dilewati` : ''}`,
        () =>
          Promise.all(
            [...before].map(([value, ids]) =>
              transactionsApi.updateMany(ids, { [field]: value } as BulkPatch),
            ),
          )
            .then(refresh)
            .catch((error: Error) => toast.show(error.message)),
      );
    },
    onError: (error: Error) => toast.show(error.message),
  });

  const remove = useMutation({
    mutationFn: async (list: Transaction[]) => {
      await transactionsApi.removeMany(list.map((t) => t.id));
      return list;
    },
    onSuccess: async (list) => {
      await refresh();
      toast.show(`${list.length} transaksi dihapus`, () =>
        transactionsApi
          .createMany(list.map(toInput))
          .then(() => {
            // Kaitan yang kedua sisinya ikut dihapus cukup dipulihkan sekali (dari sisi pengeluaran)
            const ids = new Set(list.map((t) => t.id));
            return Promise.all(
              list.flatMap((t) => {
                const links = (t.linked ?? []).filter(
                  (l) => t.type === 'expense' || !ids.has(l.id),
                );
                return links.length ? [offsetsApi.restore(t, links)] : [];
              }),
            );
          })
          .then(refresh)
          .catch((error: Error) => toast.show(error.message)),
      );
    },
    onError: (error: Error) => toast.show(error.message),
  });

  return { update, remove };
}
