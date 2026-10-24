// Nada warna untuk ikon, batang, dan legenda. r1–r6 adalah palet grafik
// Opnamix yang dipakai untuk kategori; sisanya warna status.
export type Tone =
  'primary' | 'ok' | 'warn' | 'bad' | 'neutral' | 'r1' | 'r2' | 'r3' | 'r4' | 'r5' | 'r6';

export const TONE_CLASS: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-accent',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-surface-2 text-muted-foreground',
  r1: 'bg-r1/15 text-r1',
  r2: 'bg-r2/15 text-r2',
  r3: 'bg-r3/15 text-r3',
  r4: 'bg-r4/15 text-r4',
  r5: 'bg-r5/15 text-r5',
  r6: 'bg-r6/15 text-r6',
};

/** Warna isi solid (batang, titik legenda) */
export const TONE_FILL: Record<Tone, string> = {
  primary: 'bg-primary-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  neutral: 'bg-faint',
  r1: 'bg-r1',
  r2: 'bg-r2',
  r3: 'bg-r3',
  r4: 'bg-r4',
  r5: 'bg-r5',
  r6: 'bg-r6',
};
