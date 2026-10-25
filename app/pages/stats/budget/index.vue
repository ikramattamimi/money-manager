<script setup lang="ts">
import { ArrowLeft, PiggyBank, Plus } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import KpiStrip from '@/components/data/KpiStrip.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import Meter from '@/components/data/Meter.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import MonthPicker from '@/components/layout/MonthPicker.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import BudgetForm from '@/components/money/BudgetForm.vue';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useBudgetMonth } from '@/features/budgets/useBudgetMonth';
import { useBudgetStatus, type BudgetView } from '@/features/budgets/useBudgets';
import { useCategories } from '@/features/categories/useCategories';
import { formatRupiah, formatShort } from '@/lib/format';
import { dayKey, MONTHS_LONG, MONTHS_SHORT, periodOf, periodRangeLabel } from '@/lib/time';

// Budget bulanan: total dan per kategori, dengan progres aman / hampir habis /
// lewat. Nominal yang diubah berlaku mulai bulan yang sedang dilihat.
definePageMeta({ layout: 'app' });
useHead({ title: 'Budget · Money Manager' });

const { canEdit, monthStartDay } = useActiveBook();
const { year, month, shift, key } = useBudgetMonth();
const { query, views } = useBudgetStatus(year, month);
const categories = useCategories();

const today = computed(() => periodOf(dayKey(new Date()), monthStartDay.value));
const isCurrent = computed(
  () => year.value === today.value.year && month.value === today.value.month,
);

const totals = computed(() => {
  const total = views.value.find((v) => !v.category_id);
  const limit = total?.limit ?? views.value.reduce((s, v) => s + v.limit, 0);
  const spent = total?.spent ?? views.value.reduce((s, v) => s + v.spent, 0);
  return [
    { label: 'Batas', value: formatShort(limit) },
    { label: 'Terpakai', value: formatShort(spent), tone: 'bad' as const },
    {
      label: limit - spent >= 0 ? 'Sisa' : 'Lewat',
      value: formatShort(Math.abs(limit - spent)),
      tone: limit - spent >= 0 ? ('ok' as const) : ('bad' as const),
    },
  ];
});
const STATUS_CLASS = { ok: 'text-muted-foreground', warn: 'text-warn', bad: 'text-bad' } as const;
const style = (b: BudgetView) =>
  b.category_id ? categories.style(b.category_id) : { icon: PiggyBank, tone: 'primary' as const };

const { openAsPage } = useFormPage();
const formOpen = ref(false);
const editing = ref<BudgetView | null>(null);
const session = ref(0);
function openForm(budget: BudgetView | null) {
  if (!canEdit.value) return;
  const path = budget
    ? `/stats/budget/${budget.category_id ?? 'total'}?month=${key.value}`
    : `/stats/budget/new?month=${key.value}`;
  if (openAsPage(path)) return;
  editing.value = budget;
  session.value++;
  formOpen.value = true;
}
</script>

<template>
  <div class="mx-auto md:max-w-[720px]">
    <PageHeader title="Budget" :summary="`${MONTHS_SHORT[month - 1]} ${year}`">
      <template #actions>
        <HeaderButton label="Kembali ke Statistik" @click="navigateTo('/stats')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <MonthPicker
          :label="`${MONTHS_SHORT[month - 1]} ${year}`"
          :hint="periodRangeLabel(year, month, monthStartDay)"
          :can-next="!isCurrent"
          @prev="shift(-1)"
          @next="shift(1)"
        />
        <HeaderButton v-if="canEdit" label="Tambah budget" @click="openForm(null)">
          <Plus aria-hidden="true" />
        </HeaderButton>
      </template>
      <KpiStrip v-if="views.length" :items="totals" />
    </PageHeader>

    <Card v-if="query.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="4" /></Card>
    <Card v-else-if="!views.length" class="mt-3.5">
      <EmptyState
        :icon="PiggyBank"
        :title="`Belum ada budget untuk ${MONTHS_LONG[month - 1]}`"
        description="Buat budget total atau per kategori. Budget berlaku terus ke bulan berikutnya sampai diubah."
      />
    </Card>

    <ListGroup v-else label="Budget bulan ini" :aside="`${views.length} budget`">
      <ListRow
        v-for="b in views"
        :key="b.budget_id"
        :as="canEdit ? 'button' : 'div'"
        :title="b.label"
        class="items-start"
        @click="openForm(b)"
      >
        <template #lead><ToneIcon v-bind="style(b)" /></template>
        <template #below>
          <Meter :value="b.ratio" :tone="b.tone" :label="`Budget ${b.label}`" class="mt-1.5" />
          <small class="mt-1 text-xs tabular-nums text-muted-foreground">
            {{ formatRupiah(b.spent) }} dari {{ formatRupiah(b.limit) }} ·
            {{ Math.round(b.ratio * 100) }}%
            <template v-if="b.carried"> · sisa bulan lalu +{{ formatShort(b.carried) }}</template>
          </small>
        </template>
        <template #end>
          <span :class="['text-xs font-semibold tabular-nums', STATUS_CLASS[b.tone]]">
            {{
              b.remaining >= 0
                ? `Sisa ${formatShort(b.remaining)}`
                : `Lewat ${formatShort(-b.remaining)}`
            }}
          </span>
        </template>
      </ListRow>
    </ListGroup>

    <Overlay v-model:open="formOpen" labelledby="budget-form-title">
      <BudgetForm
        :key="session"
        :budget="editing"
        :year="year"
        :month="month"
        :taken="views.map((v) => v.category_id)"
        title-id="budget-form-title"
        @close="formOpen = false"
      />
    </Overlay>
  </div>
</template>
