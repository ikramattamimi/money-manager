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
