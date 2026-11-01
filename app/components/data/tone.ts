// Nada warna untuk ikon, batang, dan legenda. Kategori dan grup akun di
// database menyimpan r1–r6 atau neutral; nama iOS (blue, orange, …) dipakai
// untuk ikon sistem seperti baris Lainnya. Nilai di tokens.css (--tone-*).
export type IosTone =
  'blue' | 'orange' | 'green' | 'amber' | 'pink' | 'purple' | 'teal' | 'indigo' | 'red' | 'gray';
export type Tone =
  | 'primary'
  | 'ok'
  | 'warn'
  | 'bad'
  | 'neutral'
  | 'r1'
  | 'r2'
  | 'r3'
  | 'r4'
  | 'r5'
  | 'r6'
  | IosTone;

/** Nada iOS di balik tiap nama nada */
export const IOS_TONE: Record<Tone, IosTone> = {
  primary: 'blue',
  ok: 'green',
  warn: 'amber',
  bad: 'red',
  neutral: 'gray',
  r1: 'blue',
  r2: 'orange',
  r3: 'green',
  r4: 'amber',
  r5: 'pink',
  r6: 'purple',
  blue: 'blue',
  orange: 'orange',
  green: 'green',
  amber: 'amber',
  pink: 'pink',
  purple: 'purple',
  teal: 'teal',
  indigo: 'indigo',
  red: 'red',
  gray: 'gray',
};

// Kelas ditulis utuh supaya terbaca pemindai Tailwind
const SOFT: Record<IosTone, string> = {
  blue: 'bg-[var(--tone-blue-soft)] text-[var(--tone-blue-ink)]',
  orange: 'bg-[var(--tone-orange-soft)] text-[var(--tone-orange-ink)]',
  green: 'bg-[var(--tone-green-soft)] text-[var(--tone-green-ink)]',
  amber: 'bg-[var(--tone-amber-soft)] text-[var(--tone-amber-ink)]',
  pink: 'bg-[var(--tone-pink-soft)] text-[var(--tone-pink-ink)]',
  purple: 'bg-[var(--tone-purple-soft)] text-[var(--tone-purple-ink)]',
  teal: 'bg-[var(--tone-teal-soft)] text-[var(--tone-teal-ink)]',
  indigo: 'bg-[var(--tone-indigo-soft)] text-[var(--tone-indigo-ink)]',
  red: 'bg-[var(--tone-red-soft)] text-[var(--tone-red-ink)]',
  gray: 'bg-[var(--tone-gray-soft)] text-[var(--tone-gray-ink)]',
};
const INK: Record<IosTone, string> = {
  blue: 'text-[var(--tone-blue-ink)]',
  orange: 'text-[var(--tone-orange-ink)]',
  green: 'text-[var(--tone-green-ink)]',
  amber: 'text-[var(--tone-amber-ink)]',
  pink: 'text-[var(--tone-pink-ink)]',
  purple: 'text-[var(--tone-purple-ink)]',
  teal: 'text-[var(--tone-teal-ink)]',
  indigo: 'text-[var(--tone-indigo-ink)]',
  red: 'text-[var(--tone-red-ink)]',
  gray: 'text-[var(--tone-gray-ink)]',
};
const FILL: Record<IosTone, string> = {
  blue: 'bg-[var(--tone-blue)]',
  orange: 'bg-[var(--tone-orange)]',
  green: 'bg-[var(--tone-green)]',
  amber: 'bg-[var(--tone-amber)]',
  pink: 'bg-[var(--tone-pink)]',
  purple: 'bg-[var(--tone-purple)]',
  teal: 'bg-[var(--tone-teal)]',
  indigo: 'bg-[var(--tone-indigo)]',
  red: 'bg-[var(--tone-red)]',
  gray: 'bg-[var(--tone-gray)]',
};

const map = (source: Record<IosTone, string>) =>
  Object.fromEntries(
    Object.entries(IOS_TONE).map(([tone, ios]) => [tone, source[ios]]),
  ) as Record<Tone, string>;

/** Ikon di kotak lembut */
export const TONE_CLASS: Record<Tone, string> = {
  ...map(SOFT),
  // Aksen app mengikuti --primary, bukan biru sistem
  primary: 'bg-primary-soft text-primary-accent',
  neutral: 'bg-fill text-muted-foreground',
};

/** Warna teks saja (ikon tanpa latar, mis. di grid pilihan) */
export const TONE_TEXT: Record<Tone, string> = {
  ...map(INK),
  primary: 'text-primary-accent',
  neutral: 'text-muted-foreground',
};

/** Warna isi solid (batang, titik legenda, latar ikon solid gaya Pengaturan iOS) */
export const TONE_FILL: Record<Tone, string> = { ...map(FILL), primary: 'bg-primary-accent' };

/** Warna masuk/keluar di grafik tren, dari palet kategori (biru-oranye tetap terbedakan untuk buta warna) */
export const TREND_TONE = { income: 'r1', expense: 'r2' } as const satisfies Record<string, Tone>;
