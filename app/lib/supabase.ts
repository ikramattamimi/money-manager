import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Hanya boleh diimpor dari app/features/*/api.ts
// (konvensi .ai/conventions/data-fetching.md).
let client: SupabaseClient | undefined;

export function useSupabase(): SupabaseClient {
  if (client) return client;

  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'NUXT_PUBLIC_SUPABASE_URL dan NUXT_PUBLIC_SUPABASE_ANON_KEY belum diisi. Lihat .env.example.',
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Login memakai kode OTP, bukan magic link, jadi URL tidak perlu dibaca
      detectSessionInUrl: false,
    },
  });
  return client;
}
