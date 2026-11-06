<script setup lang="ts">
import { ArrowLeftRight, Download } from '@lucide/vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IosButton from '@/components/ios/IosButton.vue';
import { groupStyle } from '@/features/accounts/style';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useBudgetStatus } from '@/features/budgets/useBudgets';
import { useExportExcel } from '@/features/export/useExport';
import type { Transaction } from '@/features/transactions/api';
import { netAmount, summarize } from '@/features/transactions/effects';
import { formatRupiah } from '@/lib/format';
import { MONTHS_LONG, periodDays, periodRange } from '@/lib/time';

// Ringkasan bulan (mockup isSummary): budget dengan garis hari ini, pengeluaran
// per grup akun (transfer tidak dihitung), banding bulan lalu, ekspor Excel.
const props = defineProps<{
  year: number;
  month: number;
  list: Transaction[];
  today: string;
  /** Masuk/keluar bulan sebelumnya, untuk perbandingan */
  prev: { income: number; expense: number } | null;
}>();

const { monthStartDay } = useActiveBook();
const accounts = useAccounts();
const toast = useToast();
const exporter = useExportExcel();

const year = computed(() => props.year);
const month = computed(() => props.month);
const { views: budgets } = useBudgetStatus(year, month);

/** Posisi hari ini di periode (0–100%); bulan lalu = 100, bulan depan = 0 */
const todayPct = computed(() => {
  const days = periodDays(props.year, props.month, monthStartDay.value);
  const i = days.indexOf(props.today);
  if (i >= 0) return ((i + 1) / days.length) * 100;
  return props.today > days[days.length - 1]! ? 100 : 0;
});

const budgetRows = computed(() =>
  budgets.value.map((b) => ({
    id: b.budget_id,
    label: b.label,
    left:
      b.remaining >= 0
        ? `Sisa ${formatRupiah(b.remaining)}`
        : `Lewat ${formatRupiah(-b.remaining)}`,
    over: b.remaining < 0,
    width: Math.min(100, b.ratio * 100),
    spent: formatRupiah(b.spent),
    of: `dari ${formatRupiah(b.limit)}`,
  })),
);

const byGroup = computed(() => {
  const sums = new Map<string, number>();
  for (const t of props.list) {
    if (t.type !== 'expense' || t.is_adjustment) continue;
    const group = accounts.byId.value.get(t.account_id)?.group_id ?? 'none';
    sums.set(group, (sums.get(group) ?? 0) + netAmount(t));
  }
  return [...sums.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => {
      const group = accounts.groupById.value.get(id);
      const { icon, tone } = groupStyle(group);
      return { id, label: group?.name ?? 'Tanpa grup', value, icon, tone };
    });
});
const transferOut = computed(() =>
  props.list.filter((t) => t.type === 'transfer').reduce((s, t) => s + t.amount, 0),
);

const prevName = computed(() => MONTHS_LONG[(props.month + 10) % 12]!);
const compare = computed(() => {
  if (!props.prev) return [];
  const now = summarize(props.list);
  const row = (label: string, cur: number, before: number, goodWhenLower: boolean) => {
    const delta = cur - before;
    const pct = before ? Math.round((Math.abs(delta) / before) * 100) : null;
    return {
      label,
      cap: `Bulan lalu ${formatRupiah(before)}`,
      delta: `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${formatRupiah(Math.abs(delta))}${pct !== null && delta ? ` (${pct}%)` : ''}`,
      tone: !delta ? undefined : delta < 0 === goodWhenLower ? ('inc' as const) : ('exp' as const),
    };
  };
  return [
    row('Pemasukan', now.income, props.prev.income, false),
    row('Pengeluaran', now.expense, props.prev.expense, true),
  ];
});

function exportMonth() {
  const range = periodRange(props.year, props.month, monthStartDay.value);
  const name = `${MONTHS_LONG[props.month - 1]} ${props.year}`;
  exporter.mutate(
    { ...range, filename: `money-manager-${name.replace(/\s+/g, '-').toLowerCase()}.xlsx` },
    {
      onSuccess: (count) => toast.show(`${count} transaksi ${name} diekspor`),
      onError: (e) => toast.show(e.message),
    },
  );
}
</script>

<template>
  <div class="pb-2">
    <GroupedList label="Budget">
      <template #aside>
        <NuxtLink to="/stats/budget" class="normal-case text-primary-accent">Atur ›</NuxtLink>
      </template>
      <p v-if="!budgetRows.length" class="m-0 px-4 py-3.5 text-meta text-muted-foreground">
        Belum ada budget untuk bulan ini.
      </p>
      <div
        v-for="(b, i) in budgetRows"
        :key="b.id"
        :class="[
          'flex flex-col gap-[7px] px-4 py-3',
          i > 0 && 'shadow-[inset_0_0.5px_0_var(--sep)]',
        ]"
      >
        <div class="flex items-baseline justify-between gap-3 text-amount font-semibold">
          <span class="truncate">{{ b.label }}</span>
          <span
            :class="[
              'shrink-0 text-meta font-medium',
              b.over ? 'text-exp' : 'text-muted-foreground',
            ]"
            >{{ b.left }}</span
          >
        </div>
        <div
          class="relative h-[9px] rounded-full bg-fill-2"
          role="meter"
          :aria-label="`${b.label}: ${b.spent} ${b.of}`"
          :aria-valuenow="Math.round(b.width)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <i
            :class="[
              'absolute inset-y-0 left-0 rounded-full',
              b.over ? 'bg-exp' : 'bg-primary-accent',
            ]"
            :style="{ width: `${b.width}%` }"
          />
          <u
            class="absolute -inset-y-[3px] w-0.5 rounded-sm bg-foreground no-underline"
            :style="{ left: `${todayPct}%` }"
            aria-hidden="true"
          />
        </div>
        <div class="flex justify-between text-note text-muted-foreground">
          <span>{{ b.spent }}</span
          ><span>{{ b.of }}</span>
        </div>
      </div>
    </GroupedList>

    <GroupedList label="Akun" aside="Pengeluaran">
      <GroupRow
        v-for="g in byGroup"
        :key="g.id"
        :title="g.label"
        :value="formatRupiah(g.value)"
        value-tone="exp"
      >
        <template #icon><ToneIcon :icon="g.icon" :tone="g.tone" size="sm" solid /></template>
      </GroupRow>
      <GroupRow
        title="Transfer"
        subtitle="Antar akun, tidak dihitung"
        :value="formatRupiah(transferOut)"
        strong
      >
        <template #icon><ToneIcon :icon="ArrowLeftRight" tone="gray" size="sm" solid /></template>
      </GroupRow>
    </GroupedList>

    <GroupedList v-if="compare.length" :label="`Dibanding ${prevName}`">
      <GroupRow
        v-for="c in compare"
        :key="c.label"
        :title="c.label"
        :subtitle="c.cap"
        :value="c.delta"
        :value-tone="c.tone"
        strong
      />
    </GroupedList>

    <div class="px-4 pt-[18px]">
      <IosButton block variant="soft" :disabled="exporter.isPending.value" @click="exportMonth">
        <Download aria-hidden="true" />Ekspor {{ MONTHS_LONG[month - 1] }} ke Excel
      </IosButton>
    </div>
  </div>
</template>
