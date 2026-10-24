export const importKeys = {
  all: ['imports'] as const,
  history: (bookId: string | null) => [...importKeys.all, 'history', bookId] as const,
};
