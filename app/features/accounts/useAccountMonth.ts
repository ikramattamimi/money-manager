import { useQuery } from '@tanstack/vue-query';
import { useActiveBook } from '@/features/books/useActiveBook';
import { accountsApi } from './api';
import { accountKeys } from './keys';
import { fromBalancesAt, monthPlan, type MonthBalance } from './months';

/** Banyak bulan untuk tren aset bersih dan tab Bulanan rincian akun */
export const TREND_MONTHS = 6;

/**
 * Saldo semua akun per bulan, `TREND_MONTHS` bulan sampai bulan terpilih
 * (RPC account_balances_at). Dipakai bersama daftar akun dan rincian akun,
 * jadi satu permintaan untuk keduanya. `available` false = RPC belum ada di
 * database; pemanggil memakai saldo sekarang (daftar) atau riwayat akun
 * (rincian).
 */
export function useAccountMonths(year: Readonly<Ref<number>>, month: Readonly<Ref<number>>) {
  const { bookId, monthStartDay } = useActiveBook();

  const query = useQuery({
    queryKey: computed(() =>
      accountKeys.months(bookId.value, year.value, month.value, TREND_MONTHS, monthStartDay.value),
    ),
    queryFn: async () => {
      const plan = monthPlan(year.value, month.value, TREND_MONTHS, monthStartDay.value);
      const rows = await accountsApi.balancesAt(bookId.value!, plan.cuts);
      return { plan, byAccount: rows ? fromBalancesAt(rows, plan) : null };
    },
    enabled: computed(() => !!bookId.value),
    // Ganti bulan: angka lama tetap tampil sampai yang baru datang
    placeholderData: (prev) => prev,
  });

  /** Bulan-bulan yang termuat, terlama dulu */
  const months = computed(() => query.data.value?.plan.months ?? []);
  const byAccount = computed(() => query.data.value?.byAccount ?? null);
  /** false hanya kalau RPC terbukti belum ada (bukan saat memuat) */
  const available = computed(() => !query.data.value || query.data.value.byAccount !== null);

  /**
   * Bulan terpilih untuk satu akun (bulan terakhir yang termuat; selama
   * memuat bulan baru masih bulan sebelumnya). undefined = tidak tersedia.
   */
  function selected(accountId: string): MonthBalance | undefined {
    return byAccount.value?.get(accountId)?.at(-1);
  }

  return { query, months, byAccount, available, selected };
}
