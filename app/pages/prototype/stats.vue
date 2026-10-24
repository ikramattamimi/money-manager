<script setup lang="ts">
import { Button } from '@/components/ui/button';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import ListRow from '@/components/data/ListRow.vue';
import Meter from '@/components/data/Meter.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import type { Tone } from '@/components/data/tone';
import CompositionBar from '@/components/charts/CompositionBar.vue';
import MonthPicker from '@/components/layout/MonthPicker.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { formatRupiah, formatShort } from '@/lib/format';
import { BUDGETS, HISTORY } from '@/mocks/data';
import { useMockLedger } from '@/mocks/useMockLedger';

definePageMeta({ layout: 'prototype' });

const ledger = useMockLedger();
const toast = useToast();

const KINDS = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
] as const;
const kind = ref<'expense' | 'income'>('expense');

const parts = computed(() => {
  const by: Record<string, number> = {};
  for (const t of ledger.txs.value)
    if (t.type === kind.value) by[t.categoryId] = (by[t.categoryId] ?? 0) + t.amount;
  return Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => {
      const c = ledger.category(id);
      return { key: id, label: c.name, value, display: formatRupiah(value), tone: c.tone as Tone };
    });
});
const total = computed(() => parts.value.reduce((s, p) => s + p.value, 0));

const budgets = computed(() => {
  const spent: Record<string, number> = {};
  for (const t of ledger.txs.value)
    if (t.type === 'expense') spent[t.categoryId] = (spent[t.categoryId] ?? 0) + t.amount;
  return BUDGETS.map(({ categoryId, limit }) => {
    const used = spent[categoryId] ?? 0;
    const ratio = used / limit;
    const tone: Tone = ratio > 1 ? 'bad' : ratio > 0.8 ? 'warn' : 'ok';
    return { category: ledger.category(categoryId), used, limit, ratio, tone };
  });
});

const series = computed(() => [
  ...HISTORY,
  ['Okt', ledger.totals.value.income / 1e6, ledger.totals.value.expense / 1e6] as [
    string,
    number,
    number,
  ],
]);
const maxSeries = computed(() => Math.max(...series.value.flatMap(([, i, o]) => [i, o])));
</script>

<template>
  <div>
    <PageHeader title="Statistik">
      <template #actions>
        <MonthPicker
          label="Okt 2026"
          :can-next="false"
          @prev="toast.show('Prototipe: data hanya ada untuk Oktober')"
        />
      </template>
      <SegmentedControl v-model="kind" :options="KINDS" label="Jenis" variant="on-grad" />
    </PageHeader>

    <div class="mt-3.5 grid gap-3.5 md:grid-cols-2 md:items-start">
      <Card class="p-3.5">
        <div class="mb-3 flex items-baseline justify-between">
          <span class="text-panel font-bold"
            >{{ kind === 'expense' ? 'Pengeluaran' : 'Pemasukan' }} per kategori</span
          >
          <b class="text-[15px] tabular-nums">{{ formatRupiah(total) }}</b>
        </div>
        <CompositionBar :parts="parts" label="Komposisi per kategori" />
      </Card>

      <Card>
        <CardHead title="Budget bulan ini">
          <Button variant="soft" size="default">Atur</Button>
        </CardHead>
        <div class="flex flex-col gap-0.5 p-1 pb-2">
          <ListRow
            v-for="b in budgets"
            :key="b.category.id"
            :title="b.category.name"
            class="items-start"
          >
            <template #lead>
              <ToneIcon :icon="b.category.icon" :tone="b.category.tone as Tone" />
            </template>
            <template #below>
              <Meter
                :value="b.ratio"
                :tone="b.tone"
                :label="`Budget ${b.category.name}`"
                class="mt-1.5"
              />
              <small class="mt-1 text-xs tabular-nums text-muted-foreground">
                {{ formatRupiah(b.used) }} dari {{ formatRupiah(b.limit) }}
              </small>
            </template>
            <template #end>
              <span
                :class="[
                  'text-xs font-semibold tabular-nums',
                  b.tone === 'ok'
                    ? 'text-muted-foreground'
                    : b.tone === 'warn'
                      ? 'text-warn'
                      : 'text-bad',
                ]"
              >
                {{
                  b.ratio > 1
                    ? `Lewat ${formatShort(b.used - b.limit)}`
                    : `Sisa ${formatShort(b.limit - b.used)}`
                }}
              </span>
            </template>
          </ListRow>
        </div>
      </Card>

      <Card class="md:col-span-2">
        <CardHead title="6 bulan terakhir"
          ><span class="text-xs text-muted-foreground">juta rupiah</span></CardHead
        >
        <div class="px-3.5 pb-3.5 pt-2">
          <div
            class="grid h-30 items-end gap-2"
            :style="{ gridTemplateColumns: `repeat(${series.length}, 1fr)` }"
            role="img"
            :aria-label="
              series
                .map(([m, i, o]) => `${m}: masuk ${i.toFixed(1)} juta, keluar ${o.toFixed(1)} juta`)
                .join('; ')
            "
          >
            <div
              v-for="[m, i, o] in series"
              :key="m"
              class="flex h-full flex-col items-center justify-end gap-1.5"
            >
              <div class="flex h-full items-end gap-[3px]">
                <span
                  class="w-2.5 rounded-t-[3px] rounded-b-[1px] bg-primary-accent"
                  :style="{ height: `${(i / maxSeries) * 100}%` }"
                />
                <span
                  class="w-2.5 rounded-t-[3px] rounded-b-[1px] bg-bad/85"
                  :style="{ height: `${(o / maxSeries) * 100}%` }"
                />
              </div>
              <small class="text-2xs text-muted-foreground">{{ m }}</small>
            </div>
          </div>
          <div class="mt-2.5 flex gap-3.5 text-xs text-muted-foreground">
            <span class="flex items-center gap-1.5"
              ><i class="size-2 rounded-sm bg-primary-accent" />Masuk</span
            >
            <span class="flex items-center gap-1.5"
              ><i class="size-2 rounded-sm bg-bad" />Keluar</span
            >
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
