import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { booksApi, type BookRole } from './api';
import { bookKeys } from './keys';

export const ROLE_LABEL: Record<BookRole, string> = {
  owner: 'Pemilik',
  editor: 'Editor',
  viewer: 'Hanya lihat',
};
export const ROLE_HINT: Record<BookRole, string> = {
  owner: 'Bisa semuanya, termasuk mengundang dan menghapus buku',
  editor: 'Bisa mencatat dan mengubah transaksi, akun, kategori',
  viewer: 'Hanya melihat, tidak bisa mengubah apa pun',
};

export function useBookMembers(bookId: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => bookKeys.members(bookId.value)),
    queryFn: () => booksApi.members(bookId.value!),
    enabled: computed(() => !!bookId.value),
    staleTime: 5 * 60_000,
  });
}

export function useBookInvites(bookId: Ref<string | null>, enabled: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => bookKeys.invites(bookId.value)),
    queryFn: () => booksApi.invites(bookId.value!),
    enabled: computed(() => !!bookId.value && enabled.value),
  });
}

export function useBookMutations() {
  const client = useQueryClient();
  const toast = useToast();
  const invalidate = () => client.invalidateQueries({ queryKey: bookKeys.all });
  const onError = (error: Error) => toast.show(error.message);

  return {
    create: useMutation({
      mutationFn: (name: string) => booksApi.create(name),
      onSuccess: invalidate,
      onError,
    }),
    rename: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) => booksApi.rename(id, name),
      onSuccess: invalidate,
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => booksApi.remove(id),
      onSuccess: invalidate,
      onError,
    }),
    setRole: useMutation({
      mutationFn: (v: { bookId: string; userId: string; role: BookRole }) =>
        booksApi.setRole(v.bookId, v.userId, v.role),
      onSuccess: invalidate,
      onError,
    }),
    removeMember: useMutation({
      mutationFn: (v: { bookId: string; userId: string }) =>
        booksApi.removeMember(v.bookId, v.userId),
      onSuccess: invalidate,
      onError,
    }),
    invite: useMutation({
      mutationFn: (v: { bookId: string; email: string; role: BookRole }) =>
        booksApi.invite(v.bookId, v.email, v.role),
      onSuccess: invalidate,
      onError,
    }),
    cancelInvite: useMutation({
      mutationFn: (id: string) => booksApi.cancelInvite(id),
      onSuccess: invalidate,
      onError,
    }),
  };
}

/** Link undangan untuk dibagikan; host diambil dari alamat app yang sedang dibuka */
export function inviteLink(token: string) {
  const origin = import.meta.client ? window.location.origin : '';
  return `${origin}/invite/${token}`;
}
