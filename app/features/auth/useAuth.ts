import type { Session } from '@supabase/supabase-js';
import { authApi } from './api';

/**
 * Sesi login yang dibagikan ke seluruh app. Diisi sekali oleh plugin
 * auth.client.ts, lalu diperbarui setiap kali status login berubah
 * (masuk, keluar, token diperbarui).
 */
export function useAuth() {
  // Diambil saat useAuth() dipanggil (setup, plugin, middleware), karena
  // signOut biasanya dipanggil dari event handler di luar konteks Nuxt.
  const nuxtApp = useNuxtApp();
  const session = useState<Session | null>('auth:session', () => null);
  const ready = useState('auth:ready', () => false);

  const user = computed(() => session.value?.user ?? null);
  const isLoggedIn = computed(() => session.value !== null);

  async function init() {
    if (ready.value) return;
    session.value = await authApi.getSession();
    authApi.onChange((next) => {
      session.value = next;
    });
    ready.value = true;
  }

  async function signOut() {
    await authApi.signOut();
    session.value = null;
    // Data buku user sebelumnya tidak boleh terlihat oleh user berikutnya
    nuxtApp.$queryClient.clear();
  }

  return { session, user, isLoggedIn, ready, init, signOut };
}
