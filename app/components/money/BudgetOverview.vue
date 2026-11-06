<script setup lang="ts">
import { ChevronRight, PiggyBank } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import IosButton from '@/components/ios/IosButton.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useBudgetStatus } from '@/features/budgets/useBudgets';
import { useCategories } from '@/features/categories/useCategories';
import { formatRupiah } from '@/lib/format';
import { MONTHS_LONG, periodRangeLabel } from '@/lib/time';

// Tab Budget di Statistik (mockup stats-budget): kartu "Sisa (bulanan)" +
// Atur budget, lalu baris per budget (nama, nominal, bar persen, terpakai,
// sisa); merah kalau lewat. "Lainnya" = pengeluaran di luar kategori yang
// punya budget. Budget selalu per bulan: bulan terakhir periode terpilih.
const props = defineProps<{
  year: number;
  month: number;
  /** Total pengeluaran bulan itu (untuk baris Lainnya); null = tidak diketahui */
  expenseTotal: number | null;
}>();

const { canEdit, monthStartDay } = useActiveBook();
const categories = useCategories();
const year = computed(() => props.year);
const month = computed(() => props.month);
const { query, views } = useBudgetStatus(year, month);

const range = computed(
  () =>
    periodRangeLabel(props.year, props.month, monthStartDay.value) ||
    `${MONTHS_LONG[props.month - 1]} ${props.year}`,
);
const total = computed(() => views.value.find((v) => !v.category_id) ?? null);
const perCategory = computed(() => views.value.filter((v) => v.category_id));
const remaining = computed(() => {
  if (total.value) return total.value.remaining;
  return perCategory.value.reduce((s, v) => s + v.remaining, 0);
});
const other = computed(() => {
  if (props.expenseTotal === null || !perCategory.value.length) return null;
  const covered = perCategory.value.reduce((s, v) => s + v.spent, 0);
  return Math.max(0, props.expenseTotal - covered);
});

const rows = computed(() =>
  [...(total.value ? [total.value] : []), ...perCategory.value].map((b) => {
    const style = b.category_id
      ? categories.style(b.category_id)
      : { icon: PiggyBank, tone: 'primary' as const };
    const pct = Math.round(b.ratio * 100);
    return {
      key: b.category_id ?? 'total',
      label: b.label,
      ...style,
      budget: formatRupiah(b.limit),
      width: Math.min(100, b.ratio * 100),
      pct: `${pct}%`,
      // Teks persen putih di atas bar yang sudah melewatinya
      pctOnBar: pct >= 85,
      over: b.remaining < 0,
      spent: formatRupiah(b.spent),
      left: formatRupiah(b.remaining),
    };
  }),
);
</script>

<template>
  <div>
    <div class="bg-card pb-0.5 pt-2.5 text-center text-label font-semibold tracking-[-0.01em]">
      {{ range }}
    </div>
    <EmptyCard
      v-if="!query.isPending.value && !views.length"
      title="Belum ada budget"
      description="Atur budget total atau per kategori. Budget berlaku terus ke bulan berikutnya sampai diubah."
    >
      <IosButton v-if="canEdit" variant="soft" to="/stats/budget">Atur budget</IosButton>
    </EmptyCard>
    <!-- Data bulan sebelumnya sambil menunggu: redup, sama seperti donat dan Ringkasan -->
    <div
      v-else
      :class="['transition-opacity duration-200', query.isPlaceholderData.value && 'opacity-60']"
    >
      <div
        class="flex items-end gap-3 bg-card px-4 pb-3.5 pt-4 shadow-[inset_0_-0.5px_0_var(--sep)]"
      >
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <small class="text-note text-muted-foreground">Sisa (bulanan)</small>
          <b
            :class="[
              'text-[32px] font-bold leading-[1.1] tracking-[-0.035em]',
              remaining < 0 && 'text-exp',
            ]"
            >{{ formatRupiah(remaining) }}</b
          >
        </div>
        <NuxtLink
          to="/stats/budget"
          class="budget-set mb-1 inline-flex h-[38px] items-center gap-1 rounded-[10px] bg-fill pl-3.5 pr-2.5 text-label font-semibold active:scale-[0.96]"
        >
          Atur budget<ChevronRight class="size-3.5" stroke-width="2.6" aria-hidden="true" />
        </NuxtLink>
      </div>
      <div class="bg-card">
        <NuxtLink
          v-for="b in rows"
          :key="b.key"
          :to="`/stats/budget/${b.key}?month=${year}-${String(month).padStart(2, '0')}`"
          :class="[
            'budget-row grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] items-center gap-3.5 px-4 py-3 active:bg-fill-press',
          ]"
        >
          <span class="flex min-w-0 flex-col gap-1">
            <span class="flex items-center gap-1.5 truncate text-note text-muted-foreground">
              <ToneIcon :icon="b.icon" :tone="b.tone" size="xs" />{{ b.label }}
            </span>
            <b class="whitespace-nowrap text-amount font-semibold tracking-[-0.01em]">{{
              b.budget
            }}</b>
          </span>
          <span class="flex min-w-0 flex-col gap-[5px]">
            <span
              class="relative h-[26px] overflow-hidden rounded-[7px] bg-fill-2"
              role="meter"
              :aria-label="`${b.label}: ${b.pct} terpakai`"
              :aria-valuenow="Math.round(b.width)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <i
                :class="[
                  'budget-fill absolute inset-0',
                  b.over ? 'bg-[var(--tone-red)]' : 'bg-[var(--tone-blue)]',
                ]"
                :style="{ '--w': `${b.width}%` }"
              />
              <em
                :class="[
                  'absolute right-2 top-1/2 -translate-y-1/2 text-label font-semibold not-italic',
                  b.pctOnBar ? 'text-white' : 'text-foreground',
                ]"
                >{{ b.pct }}</em
              >
            </span>
            <span class="flex justify-between gap-2 whitespace-nowrap text-label font-medium">
              <span :class="b.over ? 'text-exp' : 'text-inc'">{{ b.spent }}</span>
              <span>{{ b.left }}</span>
            </span>
          </span>
        </NuxtLink>
        <NuxtLink
          v-if="other !== null"
          :to="`/stats/budget/other?month=${year}-${String(month).padStart(2, '0')}`"
          class="budget-row grid grid-cols-[minmax(0,40%)_minmax(0,1fr)_auto] items-center gap-x-2 px-4 py-3 active:bg-fill-press"
        >
          <b class="text-label font-medium">Lainnya</b>
          <span class="flex justify-between gap-2 whitespace-nowrap pl-1.5 text-label font-medium">
            <span class="text-muted-foreground">Tanpa budget</span>
            <span>{{ formatRupiah(other) }}</span>
          </span>
          <ChevronRight class="-ml-2 size-4 text-chevron" stroke-width="2.6" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.budget-set {
  transition: transform 140ms var(--ease-out);
}
/* Isi bar selebar penuh lalu dipotong (bukan scaleX supaya sudut 7px tidak
   gepeng). Hanya bergerak saat nilai berganti, mis. data bulan baru tiba;
   Reduce Motion: langsung ke nilai baru seperti TrendBars. */
.budget-fill {
  clip-path: inset(0 calc(100% - var(--w)) 0 0 round 7px);
  transition: clip-path 300ms var(--ease-out);
}
@media (prefers-reduced-motion: reduce) {
  .budget-fill {
    transition: none;
  }
}
.budget-row {
  position: relative;
  transition: background-color 120ms ease;
}
.budget-row + .budget-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 0;
  height: 0.5px;
  background: var(--sep);
}
</style>
