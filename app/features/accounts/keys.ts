export const accountKeys = {
  all: ['accounts'] as const,
  list: (bookId: string | null) => [...accountKeys.all, 'list', bookId] as const,
  groups: (bookId: string | null) => [...accountKeys.all, 'groups', bookId] as const,
  totals: (bookId: string | null) => [...accountKeys.all, 'totals', bookId] as const,
  ledger: (accountId: string) => [...accountKeys.all, 'ledger', accountId] as const,
};
