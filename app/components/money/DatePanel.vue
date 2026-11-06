<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { mondayOffset } from '@/features/transactions/grouping';
import { addMonths, daysInMonth, jakartaParts, MONTHS_LONG } from '@/lib/time';

// Panel tanggal & jam di dock (mockup .dp): kalender bulan dengan ‹ ›, chip
// Kemarin / Hari ini, jam ±15 menit, dan chip jam cepat. Memilih tanggal
// langsung mengubah form; tidak menutup panel supaya jam bisa diatur juga.
const date = defineModel<string>('date', { required: true });
const time = defineModel<string>('time', { required: true });

const pad = (n: number) => String(n).padStart(2, '0');
const now = jakartaParts(new Date());
const today = `${now.year}-${pad(now.month)}-${pad(now.day)}`;
const yesterday = (() => {
  const t = new Date(Date.UTC(now.year, now.month - 1, now.day - 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
})();

const shown = ref({ year: Number(date.value.slice(0, 4)), month: Number(date.value.slice(5, 7)) });
watch(date, (d) => (shown.value = { year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) }));
const shift = (n: number) => (shown.value = addMonths(shown.value.year, shown.value.month, n));

const days = computed(() =>
  Array.from({ length: daysInMonth(shown.value.year, shown.value.month) }, (_, i) => {
    const key = `${shown.value.year}-${pad(shown.value.month)}-${pad(i + 1)}`;
    return { key, n: i + 1 };
  }),
);
const blanks = computed(() => mondayOffset(days.value[0]!.key));

function step(minutes: number) {
  const [h, m] = time.value.split(':').map(Number) as [number, number];
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  time.value = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
const QUICK = ['07:00', '12:00', '15:00', '18:00', '21:00'];
const label = (t: string) => t.replace(':', '.');
</script>

<template>
  <div class="bg-[var(--kb-head)] px-2.5 pb-[30px] pt-2">
    <div class="flex items-center gap-1.5 pb-2">
      <button
        type="button"
        aria-label="Bulan sebelumnya"
        class="grid size-9 place-items-center rounded-[10px] bg-fill active:bg-fill-press"
        @click="shift(-1)"
      >
        <ChevronLeft class="size-4" stroke-width="2.4" aria-hidden="true" />
      </button>
      <b class="flex-1 text-body">{{ MONTHS_LONG[shown.month - 1] }} {{ shown.year }}</b>
      <button
        type="button"
        :class="[
          'h-[30px] rounded-full px-[11px] text-meta font-semibold',
          date === yesterday ? 'bg-primary-soft text-primary-accent' : 'bg-fill',
        ]"
        @click="date = yesterday"
      >
        Kemarin
      </button>
      <button
        type="button"
        :class="[
          'h-[30px] rounded-full px-[11px] text-meta font-semibold',
          date === today ? 'bg-primary-soft text-primary-accent' : 'bg-fill',
        ]"
        @click="date = today"
      >
        Hari ini
      </button>
      <button
        type="button"
        aria-label="Bulan berikutnya"
        class="grid size-9 place-items-center rounded-[10px] bg-fill active:bg-fill-press"
        @click="shift(1)"
      >
        <ChevronRight class="size-4" stroke-width="2.4" aria-hidden="true" />
      </button>
    </div>
    <div class="grid grid-cols-7 gap-0.5">
      <span
        v-for="h in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']"
        :key="h"
        class="pb-1 pt-0.5 text-center text-2xs font-semibold text-muted-foreground"
        >{{ h }}</span
      >
      <span v-for="n in blanks" :key="`b${n}`" />
      <button
        v-for="d in days"
        :key="d.key"
        type="button"
        :aria-pressed="d.key === date"
        :aria-current="d.key === today ? 'date' : undefined"
        :class="[
          'h-9 rounded-full text-center text-body',
          d.key === date
            ? 'bg-primary font-semibold text-primary-foreground'
            : d.key === today
              ? 'font-bold text-primary-accent'
              : 'active:bg-fill-press',
        ]"
        @click="date = d.key"
      >
        {{ d.n }}
      </button>
    </div>
    <div class="mt-2 flex items-center gap-2 border-t-[0.5px] border-sep px-0.5 pt-2.5">
      <b class="text-label font-semibold text-muted-foreground">Jam</b>
      <div
        class="ml-auto flex items-center gap-0.5 rounded-[10px] bg-[var(--kb-key)] p-0.5 shadow-[0_1px_0_var(--kb-shadow)]"
      >
        <button
          type="button"
          aria-label="Mundur 15 menit"
          class="grid h-8 w-[34px] place-items-center rounded-lg text-[18px] text-primary-accent active:bg-fill"
          @click="step(-15)"
        >
          −
        </button>
        <b class="min-w-[52px] text-center text-row font-semibold">{{ label(time) }}</b>
        <button
          type="button"
          aria-label="Maju 15 menit"
          class="grid h-8 w-[34px] place-items-center rounded-lg text-[18px] text-primary-accent active:bg-fill"
          @click="step(15)"
        >
          +
        </button>
      </div>
    </div>
    <div class="flex gap-1.5 overflow-x-auto pt-2.5 [scrollbar-width:none]">
      <button
        v-for="t in QUICK"
        :key="t"
        type="button"
        :class="[
          'h-[30px] shrink-0 rounded-full px-[11px] text-meta font-semibold',
          time === t ? 'bg-primary-soft text-primary-accent' : 'bg-fill',
        ]"
        @click="time = t"
      >
        {{ label(t) }}
      </button>
    </div>
  </div>
</template>
