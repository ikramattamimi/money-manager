const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** Nominal disimpan sebagai rupiah utuh (bigint di database). */
export function formatRupiah(amount: number): string {
  // Intl memakai spasi tak terputus setelah "Rp"; diseragamkan jadi spasi biasa.
  return rupiah.format(amount).replace(/\s/g, ' ');
}

/**
 * Nominal ringkas untuk chip dan kalender: "9,06 jt", "87 rb".
 * `tight` tanpa spasi dan satu desimal ("1,5jt", "87rb") untuk sel sempit.
 * Tanda minus pakai karakter minus (−), bukan tanda hubung.
 */
export function formatShort(amount: number, tight = false): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  const gap = tight ? '' : ' ';
  if (abs >= 1e6) {
    const value = (abs / 1e6).toLocaleString('id-ID', { maximumFractionDigits: tight ? 1 : 2 });
    return `${sign}${value}${gap}jt`;
  }
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}${gap}rb`;
  return `${sign}${abs}`;
}
