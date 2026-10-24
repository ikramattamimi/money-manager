<script setup lang="ts">
import { PiggyBank } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListRow from '@/components/data/ListRow.vue';
import Meter from '@/components/data/Meter.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import { Button } from '@/components/ui/button';
import { useBudgetMonth } from '@/features/budgets/useBudgetMonth';
import { useBudgetStatus, type BudgetView } from '@/features/budgets/useBudgets';
import { formatRupiah, formatShort } from '@/lib/format';
import { MONTHS_LONG } from '@/lib/time';

// Ringkasan budget bulan (year, month) di atas Statistik: budget total dan
// tiga kategori yang paling mendekati habis.
const props = defineProps<{ year: number; month: number }>();
const { query, views } = useBudgetStatus(toRef(props, 'year'), toRef(props, 'month'));
const budgetMonth = useBudgetMonth();
function openBudget() {
  // Halaman Budget membuka bulan yang sama dengan ringkasan ini
  budgetMonth.ym.value = { year: props.year, month: props.month };
  navigateTo('/stats/budget');
}

const shown = computed(() => {
  const total = views.value.find((v) => !v.category_id);
  const categories = views.value.filter((v) => v.category_id).slice(0, total ? 3 : 4);
  return total ? [total, ...categories] : categories;
});
const status = (b: BudgetView) =>
  b.remaining >= 0 ? `Sisa ${formatShort(b.remaining)}` : `Lewat ${formatShort(-b.remaining)}`;
const STATUS_CLASS = { ok: 'text-muted-foreground', warn: 'text-warn', bad: 'text-bad' } as const;
</script>

<template>
  <Card>
    <CardHead :title="`Budget ${MONTHS_LONG[month - 1]}`">
      <Button variant="soft" size="default" @click="openBudget">
        {{ views.length ? 'Atur' : 'Buat budget' }}
      </Button>
    </CardHead>
    <div v-if="query.isPending.value" class="p-1"><Skeleton :rows="2" /></div>
    <EmptyState
      v-else-if="!views.length"
      :icon="PiggyBank"
      title="Belum ada budget"
      description="Batasi pengeluaran per bulan, total atau per kategori."
    />
    <div v-else class="flex flex-col gap-0.5 p-1 pb-2">
      <ListRow v-for="b in shown" :key="b.budget_id" :title="b.label" class="items-start">
        <template #below>
          <Meter :value="b.ratio" :tone="b.tone" :label="`Budget ${b.label}`" class="mt-1.5" />
          <small class="mt-1 text-xs tabular-nums text-muted-foreground">
            {{ formatRupiah(b.spent) }} dari {{ formatRupiah(b.limit) }}
            <template v-if="b.carried">
              (termasuk sisa bulan lalu {{ formatShort(b.carried) }})</template
            >
          </small>
        </template>
        <template #end>
          <span :class="['text-xs font-semibold tabular-nums', STATUS_CLASS[b.tone]]">{{
            status(b)
          }}</span>
        </template>
      </ListRow>
    </div>
  </Card>
</template>
