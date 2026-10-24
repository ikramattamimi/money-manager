import { useQuery } from '@tanstack/vue-query';
import { useAuth } from '@/features/auth/useAuth';
import { booksApi } from './api';
import { bookKeys } from './keys';

export function useBooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: bookKeys.list(),
    queryFn: () => booksApi.list(user.value!.id),
    enabled: computed(() => user.value !== null),
  });
}
