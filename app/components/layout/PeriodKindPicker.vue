<script setup lang="ts">
import FormField from '@/components/base/FormField.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import { todayWib, type PeriodKind } from '@/features/stats/period';
import { useStatsPeriod } from '@/features/stats/useStats';

// Pilih jenis periode statistik. Rentang membuka dua kolom tanggal.
const { period, bounds } = useStatsPeriod();

const KINDS = [
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
  { value: 'year', label: 'Tahun' },
  { value: 'range', label: 'Rentang' },
] as const;

const kind = computed({
  get: () => period.value.kind,
  set: (value: PeriodKind) => {
    const today = todayWib();
    // Rentang awal: bulan yang sedang dilihat sampai hari ini
    period.value =
      value === 'range'
        ? { kind: 'range', anchor: today, from: `${today.slice(0, 8)}01`, to: today }
        : { kind: value, anchor: period.value.kind === 'range' ? today : period.value.anchor };
  },
});
const max = todayWib();
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <SegmentedControl v-model="kind" :options="KINDS" label="Periode" />
    <div v-if="period.kind === 'range'" class="grid grid-cols-2 gap-3">
      <FormField label="Dari" for="period-from">
        <input
          id="period-from"
          :value="period.from"
          type="date"
          :max="period.to ?? max"
          class="field-input"
          @change="period = { ...period, from: ($event.target as HTMLInputElement).value }"
        />
      </FormField>
      <FormField label="Sampai" for="period-to">
        <input
          id="period-to"
          :value="period.to"
          type="date"
          :min="period.from"
          :max="max"
          class="field-input"
          @change="period = { ...period, to: ($event.target as HTMLInputElement).value }"
        />
      </FormField>
    </div>
    <span class="sr-only" aria-live="polite">Periode {{ bounds.label }}</span>
  </div>
</template>
