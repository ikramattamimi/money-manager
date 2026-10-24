export const transactionKeys = {
  all: ['transactions'] as const,
  month: (bookId: string | null, year: number, month: number) =>
    [...transactionKeys.all, 'month', bookId, year, month] as const,
  overview: (bookId: string | null, year: number) =>
    [...transactionKeys.all, 'overview', bookId, year] as const,
};
