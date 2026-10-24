<script setup lang="ts">
import MonthPicker from './MonthPicker.vue';
import { hasNext, shiftPeriod } from '@/features/stats/period';
import { useStatsPeriod } from '@/features/stats/useStats';

// ‹ Oktober 2026 › untuk periode statistik (minggu/bulan/tahun/rentang)
const { period, bounds } = useStatsPeriod();
const shift = (delta: number) => (period.value = shiftPeriod(period.value, delta));
</script>

<template>
  <MonthPicker
    :label="bounds.label"
    :can-next="hasNext(period)"
    @prev="shift(-1)"
    @next="shift(1)"
  />
</template>
