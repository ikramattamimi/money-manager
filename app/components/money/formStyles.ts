// Kelas bersama form gaya grup iOS (form akun, grup, total, sesuaikan saldo).
// Ditulis utuh supaya terbaca pemindai Tailwind.

/** Judul grup di atas kartu (mockup .sh) */
export const FORM_SH =
  'm-0 px-4 pb-1.5 pt-5 text-meta uppercase tracking-[0.02em] text-muted-foreground';

/** Keterangan di bawah kartu (mockup .imfoot) */
export const FORM_NOTE = 'm-0 px-4 pt-1.5 text-meta leading-[1.4] text-muted-foreground';

/** Isian teks rata kanan di baris (mockup .fin) */
export const FORM_INPUT =
  'h-[34px] min-w-0 flex-1 bg-transparent text-right text-amount outline-none placeholder:text-ter';

/** Pilihan bawaan (roda iOS) rata kanan di baris */
export const FORM_SELECT =
  'max-w-[55%] appearance-none bg-transparent text-right text-amount text-muted-foreground outline-none [text-align-last:right] focus-visible:text-primary-accent';

/** Kartu grup: putih di halaman (latar abu), abu di dialog/lembar (latar putih) */
export const formGroup = (page?: boolean) => [
  'overflow-hidden rounded-group',
  page ? 'bg-card' : 'bg-background',
];
