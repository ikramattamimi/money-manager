import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useActiveBook } from '@/features/books/useActiveBook';
import { transactionKeys } from '@/features/transactions/keys';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';
import { accountsApi, type Account, type AccountGroup, type AccountTotal } from './api';
import { accountKeys } from './keys';
import { groupStyle } from './style';

export interface AccountGroupView extends AccountGroup {
  accounts: Account[];
  sum: number;
}

export interface AccountTotalView extends AccountTotal {
  accounts: Account[];
  sum: number;
}

export function useAccounts() {
  const { bookId } = useActiveBook();
  const enabled = computed(() => !!bookId.value);

  const accounts = useQuery({
    queryKey: computed(() => accountKeys.list(bookId.value)),
    queryFn: () => accountsApi.list(bookId.value!),
    enabled,
  });
  const groups = useQuery({
    queryKey: computed(() => accountKeys.groups(bookId.value)),
    queryFn: () => accountsApi.groups(bookId.value!),
    enabled,
    staleTime: 5 * 60_000,
  });
  const accountTotals = useQuery({
    queryKey: computed(() => accountKeys.totals(bookId.value)),
    queryFn: () => accountsApi.totals(bookId.value!),
    enabled,
    staleTime: 5 * 60_000,
  });

  const byId = computed(() => new Map((accounts.data.value ?? []).map((a) => [a.id, a])));
  const active = computed(() => (accounts.data.value ?? []).filter((a) => !a.archived));
  const groupById = computed(() => new Map((groups.data.value ?? []).map((g) => [g.id, g])));

  /** Grup akun berisi akun aktif, hanya grup yang punya akun */
  const grouped = computed<AccountGroupView[]>(() =>
    (groups.data.value ?? [])
      .map((g) => {
        const list = active.value.filter((a) => a.group_id === g.id);
        return { ...g, accounts: list, sum: list.reduce((s, a) => s + a.balance, 0) };
      })
      .filter((g) => g.accounts.length > 0),
  );

  /** Aset, utang, dan bersih dari akun yang `include_in_total` */
  const totals = computed(() => {
    let assets = 0;
    let debts = 0;
    for (const a of active.value) {
      if (!a.include_in_total) continue;
      if (a.balance >= 0) assets += a.balance;
      else debts += a.balance;
    }
    return { assets, debts, net: assets + debts };
  });

  /** Total buatan sendiri beserta akun aktif dan saldonya, urut seperti diatur */
  const totalViews = computed<AccountTotalView[]>(() =>
    (accountTotals.data.value ?? []).map((t) => {
      const list = active.value.filter((a) => a.total_id === t.id);
      return { ...t, accounts: list, sum: list.reduce((s, a) => s + a.balance, 0) };
    }),
  );
  const totalById = computed(() => new Map(totalViews.value.map((t) => [t.id, t])));
  /** Total yang tampil di halaman Transaksi; null = semua akun */
  const transactionsTotal = computed(() => totalViews.value.find((t) => t.on_transactions) ?? null);

  function style(accountId: string | null | undefined) {
    const account = accountId ? byId.value.get(accountId) : undefined;
    const group = account ? groupById.value.get(account.group_id) : undefined;
    return groupStyle(group);
  }

  const name = (id: string | null | undefined) => (id ? (byId.value.get(id)?.name ?? '') : '');

  return {
    accounts,
    groups,
    accountTotals,
    byId,
    active,
    grouped,
    totals,
    totalViews,
    totalById,
    transactionsTotal,
    style,
    name,
    groupById,
  };
}

export function useAccountLedger(accountId: Readonly<Ref<string>>) {
  return useQuery({
    queryKey: computed(() => accountKeys.ledger(accountId.value)),
    queryFn: () => accountsApi.ledger(accountId.value, 200),
  });
}

export function useAccountMutations() {
  const client = useQueryClient();
  const toast = useToast();
  const invalidate = () => client.invalidateQueries({ queryKey: accountKeys.all });
  const onError = (error: Error) => toast.show(error.message);

  return {
    create: useMutation({
      mutationFn: (input: TablesInsert<'accounts'>) => accountsApi.create(input),
      onSuccess: invalidate,
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'accounts'> }) =>
        accountsApi.update(id, patch),
      onSuccess: invalidate,
      onError,
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) => accountsApi.reorder(ids),
      // Urutan baru langsung terlihat; dikembalikan kalau gagal
      onMutate: async (ids) => {
        await client.cancelQueries({ queryKey: accountKeys.all });
        const saved = client.getQueriesData<Account[]>({ queryKey: [...accountKeys.all, 'list'] });
        const sortOf = new Map(ids.map((id, sort) => [id, sort]));
        client.setQueriesData<Account[]>({ queryKey: [...accountKeys.all, 'list'] }, (list) =>
          list
            ?.map((a) => (sortOf.has(a.id) ? { ...a, sort: sortOf.get(a.id)! } : a))
            .sort((a, b) => a.sort - b.sort),
        );
        return saved;
      },
      onError: (error: Error, _ids, saved) => {
        saved?.forEach(([key, data]) => client.setQueryData(key, data));
        onError(error);
      },
      onSettled: invalidate,
    }),
    createGroup: useMutation({
      mutationFn: (input: TablesInsert<'account_groups'>) => accountsApi.createGroup(input),
      onSuccess: invalidate,
      onError,
    }),
    updateGroup: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'account_groups'> }) =>
        accountsApi.updateGroup(id, patch),
      onSuccess: invalidate,
      onError,
    }),
    deleteGroup: useMutation({
      mutationFn: (id: string) => accountsApi.deleteGroup(id),
      onSuccess: invalidate,
      onError,
    }),
    reorderGroups: useMutation({
      mutationFn: (ids: string[]) => accountsApi.reorderGroups(ids),
      // Sama seperti urutan akun: langsung terlihat, dikembalikan kalau gagal
      onMutate: async (ids) => {
        await client.cancelQueries({ queryKey: accountKeys.all });
        const key = [...accountKeys.all, 'groups'];
        const saved = client.getQueriesData<AccountGroup[]>({ queryKey: key });
        const sortOf = new Map(ids.map((id, sort) => [id, sort]));
        client.setQueriesData<AccountGroup[]>({ queryKey: key }, (list) =>
          list
            ?.map((g) => (sortOf.has(g.id) ? { ...g, sort: sortOf.get(g.id)! } : g))
            .sort((a, b) => a.sort - b.sort),
        );
        return saved;
      },
      onError: (error: Error, _ids, saved) => {
        saved?.forEach(([key, data]) => client.setQueryData(key, data));
        onError(error);
      },
      onSettled: invalidate,
    }),
    createTotal: useMutation({
      mutationFn: (input: TablesInsert<'account_totals'>) => accountsApi.createTotal(input),
      onSuccess: invalidate,
      onError,
    }),
    updateTotal: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'account_totals'> }) =>
        accountsApi.updateTotal(id, patch),
      onSuccess: invalidate,
      onError,
    }),
    deleteTotal: useMutation({
      mutationFn: ({ id, bookId }: { id: string; bookId: string }) =>
        accountsApi.deleteTotal(id, bookId),
      onSuccess: invalidate,
      onError,
    }),
    setTransactionsTotal: useMutation({
      mutationFn: ({ bookId, id }: { bookId: string; id: string | null }) =>
        accountsApi.setTransactionsTotal(bookId, id),
      onSuccess: invalidate,
      onError,
    }),
    reorderTotals: useMutation({
      mutationFn: (ids: string[]) => accountsApi.reorderTotals(ids),
      onSuccess: invalidate,
      onError,
    }),
    adjust: useMutation({
      mutationFn: ({ id, actual }: { id: string; actual: number }) =>
        accountsApi.adjust(id, actual),
      onSuccess: () => {
        invalidate();
        client.invalidateQueries({ queryKey: transactionKeys.all });
      },
      onError,
    }),
  };
}
