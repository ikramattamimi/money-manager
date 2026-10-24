export const categoryKeys = {
  all: ['categories'] as const,
  list: (bookId: string | null) => [...categoryKeys.all, 'list', bookId] as const,
};
