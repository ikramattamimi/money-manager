/**
 * Bulan yang dilihat di halaman Budget: bulan terpilih bersama (Transaksi, Akun,
 * Statistik), jadi semua tab menampilkan periode yang sama.
 */
export function useBudgetMonth() {
  const selected = useSelectedMonth();
  const ym = computed({
    get: () => ({ year: selected.year.value, month: selected.month.value }),
    set: (v: { year: number; month: number }) => selected.set(v.year, v.month),
  });
  const year = selected.year;
  const month = selected.month;
  const shift = (delta: number) => selected.shift(delta);
  /** "2026-10" untuk query halaman form */
  const key = computed(() => `${year.value}-${String(month.value).padStart(2, '0')}`);
  return { ym, year, month, shift, key };
}
