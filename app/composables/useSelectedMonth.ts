import { useActiveBook } from '@/features/books/useActiveBook';
import { addMonths, dayKey, MONTHS_LONG, MONTHS_SHORT, periodOf, periodRangeLabel } from '@/lib/time';

/**
 * Bulan terpilih, dipakai bersama per `scope` dan bertahan saat pindah tab.
 * `tx` (bawaan): Transaksi, Statistik, Budget, Filter. `accounts`: tab Akun dan
 * rincian akun, mulai dari bulan berjalan dan hanya berganti dari halaman Akun.
 * Periode mengikuti tanggal awal bulan buku: awal 25 → Oktober = 25 Sep – 24 Okt.
 * Batas maju = Desember tahun berjalan (atau bulan depan kalau sudah Desember);
 * geser melewatinya memakai rubber-band.
 */
export function useSelectedMonth(scope: 'tx' | 'accounts' = 'tx') {
  const { monthStartDay } = useActiveBook();
  const current = computed(() => periodOf(dayKey(new Date()), monthStartDay.value));
  const year = useState(`${scope}:year`, () => current.value.year);
  const month = useState(`${scope}:month`, () => current.value.month);

  const index = (y: number, m: number) => y * 12 + (m - 1);
  const maxIndex = computed(() =>
    Math.max(index(current.value.year, 12), index(current.value.year, current.value.month) + 1),
  );

  const isCurrent = computed(
    () => year.value === current.value.year && month.value === current.value.month,
  );
  const canNext = computed(() => index(year.value, month.value) < maxIndex.value);

  function set(y: number, m: number) {
    if (index(y, m) > maxIndex.value) return;
    year.value = y;
    month.value = m;
  }
  function shift(delta: number) {
    const next = addMonths(year.value, month.value, delta);
    set(next.year, next.month);
  }
  function goToday() {
    set(current.value.year, current.value.month);
  }
  /** Bulan tetangga untuk petunjuk geser: "‹ Sep" / "Nov ›" */
  function neighborLabel(delta: number) {
    const n = addMonths(year.value, month.value, delta);
    return MONTHS_SHORT[n.month - 1]!;
  }

  const label = computed(() => `${MONTHS_SHORT[month.value - 1]} ${year.value}`);
  const longLabel = computed(() => `${MONTHS_LONG[month.value - 1]} ${year.value}`);
  const rangeHint = computed(() => periodRangeLabel(year.value, month.value, monthStartDay.value));

  return {
    year,
    month,
    current,
    isCurrent,
    canNext,
    maxIndex,
    set,
    shift,
    goToday,
    neighborLabel,
    label,
    longLabel,
    rangeHint,
  };
}
