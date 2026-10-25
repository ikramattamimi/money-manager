// Kunci PIN (fase 11 T2): PIN tidak pernah disimpan, hanya hash PBKDF2-SHA256
// dengan garam acak, di penyimpanan lokal perangkat ini.

export interface PinConfig {
  /** User pemilik PIN; PIN user lain di perangkat yang sama diabaikan */
  userId: string;
  salt: string;
  hash: string;
  /** 4–6 digit; layar kunci memeriksa otomatis setelah digit terakhir */
  length: number;
  /** Kunci lagi setelah app di latar belakang selama ini (menit); 0 = setiap kali */
  timeoutMin: number;
}

export const PIN_TIMEOUTS = [0, 1, 5, 15] as const;
export const MAX_ATTEMPTS = 5;
const ITERATIONS = 120_000;

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

const hex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

export function randomSalt(): string {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

/** Web Crypto hanya ada di konteks aman (HTTPS atau localhost) */
export const canUsePin = () => typeof crypto !== 'undefined' && !!crypto.subtle;

export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations: ITERATIONS,
    },
    key,
    256,
  );
  return hex(bits);
}

/** Perbandingan tanpa berhenti di karakter pertama yang beda */
export function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Perlu dikunci lagi saat kembali dari latar belakang? */
export function shouldLock(hiddenAt: number | null, now: number, timeoutMin: number): boolean {
  if (hiddenAt === null) return false;
  return now - hiddenAt >= timeoutMin * 60_000;
}
