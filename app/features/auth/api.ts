import type { AuthError, Session } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase';

/** Panjang kode OTP. Harus sama dengan "Email OTP Length" di pengaturan Supabase Auth. */
export const OTP_LENGTH = 8;

export const authApi = {
  async getSession(): Promise<Session | null> {
    const { data, error } = await useSupabase().auth.getSession();
    if (error) throw toIndonesian(error);
    return data.session;
  },

  /** Kirim kode ke email. User baru otomatis didaftarkan. */
  async sendOtp(email: string): Promise<void> {
    const { error } = await useSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) throw toIndonesian(error);
  },

  async verifyOtp(email: string, token: string): Promise<Session> {
    const { data, error } = await useSupabase().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'email',
    });
    if (error) throw toIndonesian(error);
    if (!data.session) throw new Error('Gagal masuk. Coba minta kode baru.');
    return data.session;
  },

  /** Masuk dengan email dan kata sandi (kata sandi diatur dulu di Profil) */
  async signInWithPassword(email: string, password: string): Promise<Session> {
    const { data, error } = await useSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw toIndonesian(error);
    if (!data.session) throw new Error('Gagal masuk. Coba lagi.');
    return data.session;
  },

  /** Atur atau ganti kata sandi user yang sedang masuk */
  async setPassword(password: string): Promise<void> {
    const { error } = await useSupabase().auth.updateUser({ password });
    if (error) throw toIndonesian(error);
  },

  async signOut(): Promise<void> {
    const { error } = await useSupabase().auth.signOut();
    if (error) throw toIndonesian(error);
  },

  onChange(callback: (session: Session | null) => void): () => void {
    const { data } = useSupabase().auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  },
};

const MESSAGES: Record<string, string> = {
  otp_expired: 'Kode salah atau sudah kedaluwarsa. Periksa lagi, atau minta kode baru.',
  over_email_send_rate_limit: 'Terlalu banyak permintaan kode. Tunggu sebentar lalu coba lagi.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  email_address_invalid: 'Alamat email tidak valid.',
  validation_failed: 'Alamat email tidak valid.',
  signup_disabled: 'Pendaftaran akun baru sedang ditutup.',
  invalid_credentials:
    'Email atau kata sandi salah. Belum pernah mengatur kata sandi? Masuk dengan kode email.',
  weak_password: 'Kata sandi terlalu lemah. Pakai minimal 8 karakter, campur huruf dan angka.',
  same_password: 'Kata sandi baru sama dengan yang lama.',
  email_not_confirmed: 'Email belum dikonfirmasi. Masuk dengan kode email dulu.',
  reauthentication_needed: 'Masuk ulang dengan kode email dulu, lalu ganti kata sandi.',
};

function toIndonesian(error: AuthError): Error {
  const message =
    (error.code && MESSAGES[error.code]) ||
    (error.status === 429 ? MESSAGES.over_request_rate_limit : undefined) ||
    'Terjadi kesalahan. Periksa koneksi internet lalu coba lagi.';
  return new Error(message, { cause: error });
}
