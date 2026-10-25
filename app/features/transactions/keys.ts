export const transactionKeys = {
  all: ['transactions'] as const,
  month: (bookId: string | null, year: number, month: number, startDay: number) =>
    [...transactionKeys.all, 'month', bookId, year, month, startDay] as const,
  overview: (bookId: string | null, year: number, totalId: string | null = null) =>
    [...transactionKeys.all, 'overview', bookId, year, totalId] as const,
  years: (bookId: string | null, totalId: string | null = null) =>
    [...transactionKeys.all, 'years', bookId, totalId] as const,
};
