export const bookKeys = {
  all: ['books'] as const,
  list: () => [...bookKeys.all, 'list'] as const,
  members: (bookId: string | null) => [...bookKeys.all, 'members', bookId] as const,
  invites: (bookId: string | null) => [...bookKeys.all, 'invites', bookId] as const,
  preview: (token: string) => [...bookKeys.all, 'invite', token] as const,
};
