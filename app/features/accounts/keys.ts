export const accountKeys = {
  all: ['accounts'] as const,
  list: (bookId: string | null) => [...accountKeys.all, 'list', bookId] as const,
  groups: (bookId: string | null) => [...accountKeys.all, 'groups', bookId] as const,
  totals: (bookId: string | null) => [...accountKeys.all, 'totals', bookId] as const,
  ledger: (accountId: string, limit = 200) =>
    [...accountKeys.all, 'ledger', accountId, limit] as const,
  /** Saldo per akhir bulan (RPC account_balances_at), `count` bulan sampai (year, month) */
  months: (bookId: string | null, year: number, month: number, count: number, startDay: number) =>
    [...accountKeys.all, 'months', bookId, year, month, count, startDay] as const,
};
