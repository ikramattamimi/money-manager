import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query';
import { accountKeys } from '@/features/accounts/keys';
import type { Account } from '@/features/accounts/api';
import { useActiveBook } from '@/features/books/useActiveBook';
import type { TablesUpdate } from '@/lib/database.types';
import { addMonths, jakartaParts } from '@/lib/time';
import { uuid } from '@/lib/uuid';
import { transactionsApi, type Transaction, type TxInput } from './api';
import { balanceEffects } from './effects';
import { transactionKeys } from './keys';

/** Transaksi satu bulan (WIB). Bulan sebelah di-prefetch supaya pindah bulan terasa langsung. */
export function useMonthTransactions(year: Ref<number>, month: Ref<number>) {
  const { bookId } = useActiveBook();
  const client = useQueryClient();

  const query = useQuery({
    queryKey: computed(() => transactionKeys.month(bookId.value, year.value, month.value)),
    queryFn: () => transactionsApi.listMonth(bookId.value!, year.value, month.value),
    enabled: computed(() => !!bookId.value),
  });

  watch(
    [bookId, year, month],
    ([book, y, m]) => {
      if (!book) return;
      for (const delta of [-1, 1]) {
        const n = addMonths(y, m, delta);
        client.prefetchQuery({
          queryKey: transactionKeys.month(book, n.year, n.month),
          queryFn: () => transactionsApi.listMonth(book, n.year, n.month),
        });
      }
    },
    { immediate: true },
  );

  return query;
}

export function useMonthsOverview(year: Ref<number>) {
  const { bookId } = useActiveBook();
  return useQuery({
    queryKey: computed(() => transactionKeys.overview(bookId.value, year.value)),
    queryFn: () => transactionsApi.monthsOverview(bookId.value!, year.value),
    enabled: computed(() => !!bookId.value),
  });
}

/** Transaksi yang baru disimpan/dipulihkan, untuk disorot di daftar */
export function useTxHighlight() {
  return useState<string | null>('tx:highlight', () => null);
}

// ---------------------------------------------------------------------
// Mutasi dengan optimistic update: baris dan saldo berubah seketika, lalu
// dikembalikan + toast kalau server menolak. Setelahnya data resmi dimuat ulang.
// ---------------------------------------------------------------------

type Snapshot = [readonly unknown[], unknown][];

function monthKeyOf(bookId: string, occurredAt: string) {
  const p = jakartaParts(occurredAt);
  return transactionKeys.month(bookId, p.year, p.month);
}

async function snapshot(client: QueryClient): Promise<Snapshot> {
  await client.cancelQueries({ queryKey: transactionKeys.all });
  await client.cancelQueries({ queryKey: accountKeys.all });
  return [
    ...client.getQueriesData({ queryKey: transactionKeys.all }),
    ...client.getQueriesData({ queryKey: accountKeys.all }),
  ] as Snapshot;
}

function restore(client: QueryClient, saved: Snapshot | undefined) {
  saved?.forEach(([key, data]) => client.setQueryData(key, data));
}

function shiftBalances(
  client: QueryClient,
  bookId: string,
  tx: Parameters<typeof balanceEffects>[0],
  sign: 1 | -1,
) {
  const effects = balanceEffects(tx);
  client.setQueryData<Account[]>(accountKeys.list(bookId), (list) =>
    list?.map((a) =>
      effects.has(a.id) ? { ...a, balance: a.balance + sign * effects.get(a.id)! } : a,
    ),
  );
}

/** Baris sementara untuk cache, sebelum server membalas */
function toRow(input: TxInput): Transaction {
  const now = new Date().toISOString();
  const defaults: Omit<Transaction, keyof TxInput> = {
    created_at: now,
    updated_at: now,
    created_by: null,
    dedupe_key: null,
    import_batch_id: null,
    recurring_rule_id: null,
  };
  return {
    ...defaults,
    id: input.id ?? uuid(),
    book_id: input.book_id,
    type: input.type,
    amount: input.amount,
    account_id: input.account_id,
    occurred_at: input.occurred_at ?? now,
    to_account_id: input.to_account_id ?? null,
    fee: input.fee ?? 0,
    category_id: input.category_id ?? null,
    note: input.note ?? '',
    description: input.description ?? '',
    source: input.source ?? 'manual',
    is_adjustment: input.is_adjustment ?? false,
  };
}

export function useTransactionMutations() {
  const client = useQueryClient();
  const toast = useToast();
  const highlight = useTxHighlight();

  const settle = () => {
    client.invalidateQueries({ queryKey: transactionKeys.all });
    client.invalidateQueries({ queryKey: accountKeys.all });
  };
  const fail = (error: Error, _vars: unknown, saved: Snapshot | undefined) => {
    restore(client, saved);
    toast.show(error.message);
  };

  const create = useMutation({
    mutationFn: (input: TxInput) => transactionsApi.create(input),
    onMutate: async (input) => {
      const saved = await snapshot(client);
      const row = toRow(input);
      client.setQueryData<Transaction[]>(monthKeyOf(input.book_id, row.occurred_at), (list) =>
        list ? [row, ...list].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)) : list,
      );
      shiftBalances(client, input.book_id, row, 1);
      highlight.value = row.id;
      return saved;
    },
    onError: fail,
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: ({ before, patch }: { before: Transaction; patch: TablesUpdate<'transactions'> }) =>
      transactionsApi.update(before.id, patch),
    onMutate: async ({ before, patch }) => {
      const saved = await snapshot(client);
      const after = { ...before, ...patch } as Transaction;
      // Hapus dari bulan lama, masukkan ke bulan baru (bisa berbeda kalau tanggal berubah)
      client.setQueryData<Transaction[]>(monthKeyOf(before.book_id, before.occurred_at), (list) =>
        list?.filter((t) => t.id !== before.id),
      );
      client.setQueryData<Transaction[]>(monthKeyOf(before.book_id, after.occurred_at), (list) =>
        list
          ? [after, ...list.filter((t) => t.id !== before.id)].sort((a, b) =>
              b.occurred_at.localeCompare(a.occurred_at),
            )
          : list,
      );
      shiftBalances(client, before.book_id, before, -1);
      shiftBalances(client, before.book_id, after, 1);
      highlight.value = before.id;
      return saved;
    },
    onError: fail,
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (tx: Transaction) => transactionsApi.remove(tx.id),
    onMutate: async (tx) => {
      const saved = await snapshot(client);
      client.setQueryData<Transaction[]>(monthKeyOf(tx.book_id, tx.occurred_at), (list) =>
        list?.filter((t) => t.id !== tx.id),
      );
      shiftBalances(client, tx.book_id, tx, -1);
      return saved;
    },
    onError: fail,
    onSettled: settle,
  });

  /** Hapus dengan toast Urungkan (memasukkan ulang baris yang sama, id sama) */
  function removeWithUndo(tx: Transaction, label: string) {
    remove.mutate(tx);
    toast.show(`${label} dihapus`, () => create.mutate(toInput(tx)));
  }

  return { create, update, remove, removeWithUndo };
}

export function toInput(tx: Transaction): TxInput {
  return {
    id: tx.id,
    book_id: tx.book_id,
    type: tx.type,
    amount: tx.amount,
    occurred_at: tx.occurred_at,
    account_id: tx.account_id,
    to_account_id: tx.to_account_id,
    fee: tx.fee,
    category_id: tx.category_id,
    note: tx.note,
    description: tx.description,
    source: tx.source,
    is_adjustment: tx.is_adjustment,
  };
}
