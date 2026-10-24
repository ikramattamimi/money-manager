import { createClient } from '@supabase/supabase-js';
import type { H3Event } from 'h3';
import type { Database } from '../../app/lib/database.types';

/** Ubah error Supabase jadi error HTTP dengan pesan yang bisa dibaca user */
export function dbError(error: { code?: string; message: string }) {
  if (/jwt/i.test(error.message) || error.code === 'PGRST301' || error.code === 'PGRST303') {
    return createError({ statusCode: 401, statusMessage: 'Sesi login habis. Masuk lagi.' });
  }
  if (error.code === '42501') {
    return createError({
      statusCode: 403,
      statusMessage: 'Kamu tidak punya akses mengubah buku ini.',
    });
  }
  return createError({ statusCode: 400, statusMessage: error.message });
}

/**
 * Klien Supabase atas nama user yang memanggil: token login diteruskan, jadi
 * RLS dan RPC SECURITY INVOKER berlaku persis seperti dari HP.
 */
export function supabaseForUser(event: H3Event) {
  const authorization = getHeader(event, 'authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi login tidak ditemukan. Masuk lagi.',
    });
  }
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig(event).public;
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
