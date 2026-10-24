import { safeNext } from '@/features/auth/redirect';
import { useAuth } from '@/features/auth/useAuth';

// Rute yang bisa dibuka tanpa login. /prototype berisi data tiruan (fase 3).
const PUBLIC_PREFIXES = ['/login', '/prototype'];

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth();
  if (!auth.ready.value) await auth.init();

  const isPublic = PUBLIC_PREFIXES.some((prefix) => to.path.startsWith(prefix));

  if (!auth.isLoggedIn.value && !isPublic) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} });
  }
  if (auth.isLoggedIn.value && to.path === '/login') {
    return navigateTo(safeNext(to.query.next));
  }
});
