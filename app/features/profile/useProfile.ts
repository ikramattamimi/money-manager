import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useAuth } from '@/features/auth/useAuth';
import { bookKeys } from '@/features/books/keys';
import { profileApi } from './api';

export const profileKeys = {
  all: ['profile'] as const,
  me: (userId: string | null) => [...profileKeys.all, userId] as const,
};

/** Profil user yang sedang masuk: nama tampilan dan foto */
export function useProfile() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: computed(() => profileKeys.me(user.value?.id ?? null)),
    queryFn: () => profileApi.get(user.value!.id),
    enabled: computed(() => !!user.value),
    staleTime: 5 * 60_000,
  });
  /** Nama untuk ditampilkan: nama profil, atau bagian depan email */
  const displayName = computed(
    () => query.data.value?.display_name.trim() || user.value?.email?.split('@')[0] || '',
  );
  return { ...query, displayName, avatarUrl: computed(() => query.data.value?.avatar_url ?? null) };
}

export function useProfileMutations() {
  const { user } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  // Nama dan foto juga tampil di daftar anggota buku
  const invalidate = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: profileKeys.all }),
      client.invalidateQueries({ queryKey: bookKeys.all }),
    ]);
  const onError = (error: Error) => toast.show(error.message);
  const current = () =>
    client.getQueryData<{ avatar_url: string | null }>(profileKeys.me(user.value?.id ?? null));

  return {
    rename: useMutation({
      mutationFn: (name: string) => profileApi.updateName(user.value!.id, name),
      onSuccess: invalidate,
      onError,
    }),
    upload: useMutation({
      mutationFn: (file: File) =>
        profileApi.uploadAvatar(user.value!.id, file, current()?.avatar_url ?? null),
      onSuccess: invalidate,
      onError,
    }),
    remove: useMutation({
      mutationFn: () => profileApi.removeAvatar(user.value!.id, current()?.avatar_url ?? null),
      onSuccess: invalidate,
      onError,
    }),
  };
}
