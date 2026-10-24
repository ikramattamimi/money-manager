import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type Supabase = SupabaseClient<Database>;

// Hanya boleh diimpor dari app/features/*/api.ts: komponen -> use*.ts -> api.ts
// (pola data-fetching dari opnamix, lihat .ai/plans/mvp/README.md).
let client: Supabase | undefined;

export function useSupabase(): Supabase {
  if (client) return client;

  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'NUXT_PUBLIC_SUPABASE_URL dan NUXT_PUBLIC_SUPABASE_ANON_KEY belum diisi. Lihat .env.example.',
    );
  }

  client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Login memakai kode OTP, bukan magic link, jadi URL tidak perlu dibaca
      detectSessionInUrl: false,
    },
  });
  return client;
}
