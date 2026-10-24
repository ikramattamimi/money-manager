import { useStatsPeriod } from '@/features/stats/useStats';
import { addMonths } from '@/lib/time';

/** Bulan yang dilihat di halaman Budget; awalnya bulan terakhir periode Statistik */
export function useBudgetMonth() {
  const { bounds } = useStatsPeriod();
  const ym = useState('budget:ym', () => ({
    year: bounds.value.endYear,
    month: bounds.value.endMonth,
  }));
  const year = computed(() => ym.value.year);
  const month = computed(() => ym.value.month);
  const shift = (delta: number) => (ym.value = addMonths(ym.value.year, ym.value.month, delta));
  /** "2026-10" untuk query halaman form */
  const key = computed(() => `${ym.value.year}-${String(ym.value.month).padStart(2, '0')}`);
  return { ym, year, month, shift, key };
}
