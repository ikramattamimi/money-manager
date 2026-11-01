<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import IosButton from './IosButton.vue';
import IosSheet from './IosSheet.vue';
import { MONTHS_SHORT } from '@/lib/time';

// Lembar "Pilih bulan" (mockup shMonth): tahun ‹ › di kepala lembar, grid
// 12 bulan (terpilih = isi aksen, bulan ini = garis aksen), "Kembali ke bulan
// ini". Bulan setelah batas maju tidak bisa dipilih.
const open = defineModel<boolean>('open', { required: true });
const props = defineProps<{
  year: number;
  month: number;
  current: { year: number; month: number };
  /** Indeks bulan terakhir yang boleh dipilih (tahun × 12 + bulan − 1) */
  maxIndex: number;
}>();
const emit = defineEmits<{ pick: [year: number, month: number] }>();

const shownYear = ref(props.year);
watch(open, (value) => value && (shownYear.value = props.year));

const months = computed(() =>
  MONTHS_SHORT.map((label, i) => {
    const m = i + 1;
    return {
      m,
      label,
      on: shownYear.value === props.year && m === props.month,
      now: shownYear.value === props.current.year && m === props.current.month,
      disabled: shownYear.value * 12 + i > props.maxIndex,
    };
  }),
);

function pick(y: number, m: number) {
  emit('pick', y, m);
  open.value = false;
}
</script>

<template>
  <IosSheet v-model:open="open" title="Pilih bulan">
    <template #header>
      <button
        type="button"
        aria-label="Tahun sebelumnya"
        class="grid size-9 place-items-center rounded-[10px] bg-fill active:bg-fill-press"
        @click="shownYear--"
      >
        <ChevronLeft class="size-[18px]" stroke-width="2.2" aria-hidden="true" />
      </button>
      <b class="min-w-12 text-center text-row font-bold">{{ shownYear }}</b>
      <button
        type="button"
        aria-label="Tahun berikutnya"
        :disabled="(shownYear + 1) * 12 > maxIndex"
        class="grid size-9 place-items-center rounded-[10px] bg-fill active:bg-fill-press disabled:opacity-30"
        @click="shownYear++"
      >
        <ChevronRight class="size-[18px]" stroke-width="2.2" aria-hidden="true" />
      </button>
    </template>
    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="mo in months"
        :key="mo.m"
        type="button"
        :aria-pressed="mo.on"
        :aria-current="mo.now ? 'date' : undefined"
        :disabled="mo.disabled"
        :class="[
          'month-cell h-12 rounded-xl text-body font-semibold active:scale-95 disabled:opacity-30',
          mo.on ? 'bg-primary text-primary-foreground' : 'bg-fill',
          mo.now && !mo.on && 'shadow-[inset_0_0_0_1.5px_var(--primary-accent)]',
        ]"
        @click="pick(shownYear, mo.m)"
      >
        {{ mo.label }}
      </button>
    </div>
    <template #footer>
      <IosButton block variant="gray" @click="pick(current.year, current.month)"
        >Kembali ke bulan ini</IosButton
      >
    </template>
  </IosSheet>
</template>

<style scoped>
.month-cell {
  transition: transform 140ms var(--ease-out);
}
</style>
