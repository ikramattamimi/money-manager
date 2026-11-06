<script setup lang="ts">
import { mondayOffset, weekdayOf, type Sums } from '@/features/transactions/grouping';
import { formatShort } from '@/lib/format';
import { MONTHS_LONG, MONTHS_SHORT } from '@/lib/time';

// Kalender bulan (mockup .cal/.cc): masuk, keluar, dan selisih per hari.
// Sabtu biru, Minggu merah, hari ini dalam lingkaran aksen. Ketuk tanggal =
// lembar hari itu (daftar + catat). Periode bisa melewati dua bulan kalau
// buku tidak mulai tanggal 1; tanggal 1 bulan berikutnya diberi nama bulan.
const props = defineProps<{ days: string[]; sums: Record<string, Sums>; today: string }>();
const emit = defineEmits<{ pick: [day: string] }>();

const HEADS = [
  { l: 'Sen' },
  { l: 'Sel' },
  { l: 'Rab' },
  { l: 'Kam' },
  { l: 'Jum' },
  { l: 'Sab', cls: 'text-primary-accent' },
  { l: 'Min', cls: 'text-exp' },
];
const offset = computed(() => (props.days[0] ? mondayOffset(props.days[0]) : 0));
const cells = computed(() =>
  props.days.map((key, i) => {
    const d = Number(key.slice(8));
    const wd = weekdayOf(key);
    const s = props.sums[key];
    const net = s ? s.income - s.expense : 0;
    return {
      key,
      label: i > 0 && d === 1 ? `1 ${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]}` : String(d),
      aria: `${d} ${MONTHS_LONG[Number(key.slice(5, 7)) - 1]}`,
      tone: wd === 6 ? 'text-primary-accent' : wd === 0 ? 'text-exp' : '',
      today: key === props.today,
      inc: s?.income ? formatShort(s.income, true) : '',
      exp: s?.expense ? formatShort(s.expense, true) : '',
      net: s && (s.income || s.expense) ? formatShort(net, true) : '',
    };
  }),
);
</script>

<template>
  <div class="mt-2.5 bg-card">
    <div class="grid grid-cols-7">
      <span
        v-for="h in HEADS"
        :key="h.l"
        :class="[
          'pb-1.5 pt-[7px] text-center text-2xs font-semibold shadow-[inset_0_-0.5px_0_var(--sep)]',
          h.cls ?? 'text-muted-foreground',
        ]"
        >{{ h.l }}</span
      >
    </div>
    <div class="grid grid-cols-7">
      <span v-for="n in offset" :key="`e${n}`" class="shadow-[inset_-0.5px_-0.5px_0_var(--sep)]" />
      <button
        v-for="c in cells"
        :key="c.key"
        type="button"
        :aria-label="c.aria"
        :aria-current="c.today ? 'date' : undefined"
        class="flex min-h-[66px] flex-col items-stretch px-[3px] py-1 text-right shadow-[inset_-0.5px_-0.5px_0_var(--sep)] active:bg-fill-press"
        @click="emit('pick', c.key)"
      >
        <span
          :class="[
            'mb-auto text-left text-meta font-semibold',
            c.today
              ? 'grid size-[21px] place-items-center rounded-full bg-primary text-primary-foreground'
              : ['pl-0.5', c.tone],
          ]"
          >{{ c.label }}</span
        >
        <small class="text-[9.5px] font-semibold leading-[1.2] tracking-[-0.03em] text-inc">{{
          c.inc
        }}</small>
        <small class="text-[9.5px] font-semibold leading-[1.2] tracking-[-0.03em] text-exp">{{
          c.exp
        }}</small>
        <small class="text-[9.5px] font-semibold leading-[1.2] tracking-[-0.03em]">{{
          c.net
        }}</small>
      </button>
    </div>
  </div>
</template>
