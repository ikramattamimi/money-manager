<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';

// Pembungkus chart bulanan yang bisa digeser per tahun: kepala "‹ 2026 ›" dan
// jalur geser horizontal berisi kolom bulan (lebar tetap `col` px). Tahun
// berjalan hanya sampai bulan ini (`count` = jumlah kolom). Geser sampai
// ujung lalu tarik sekali lagi = pindah ke tahun sebelumnya/sesudahnya.
// Ketukan dan geseran di dalam jalur tidak sampai ke MonthSwipe halaman
// (pointerdown dihentikan), jadi chart menang di areanya.
const props = defineProps<{
  year: number;
  /** Jumlah kolom bulan di tahun ini */
  count: number;
  /** Indeks kolom bulan terpilih di tahun ini, -1 = bukan tahun ini */
  active: number;
  col: number;
  canPrev: boolean;
  canNext: boolean;
}>();
const emit = defineEmits<{ year: [delta: 1 | -1] }>();

const scroller = ref<HTMLElement>();
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function center(index: number, smooth = false) {
  const el = scroller.value;
  if (!el) return;
  const left = index * props.col + props.col / 2 - el.clientWidth / 2;
  el.scrollTo({ left: Math.max(0, left), behavior: smooth && !reduceMotion() ? 'smooth' : 'auto' });
}

// Tahun/jumlah kolom berubah: bulan terpilih ke tengah; kalau tidak ada di
// tahun ini, tahun lebih baru mulai dari kiri, lebih lama dari kanan
watch(
  () => [props.year, props.count] as const,
  async ([y], [oldY]) => {
    await nextTick();
    const el = scroller.value;
    if (!el) return;
    if (props.active >= 0) center(props.active);
    else el.scrollLeft = y >= (oldY ?? y) ? 0 : el.scrollWidth;
  },
);
onMounted(() => center(props.active >= 0 ? props.active : props.count - 1));

// Bulan terpilih berganti dari luar (panah/geser halaman) dan keluar layar
watch(
  () => props.active,
  (i) => {
    const el = scroller.value;
    if (!el || i < 0) return;
    const x = i * props.col;
    if (x < el.scrollLeft || x + props.col > el.scrollLeft + el.clientWidth) center(i, true);
  },
);

// Tarik melewati ujung = pindah tahun
let touch: { x: number; atStart: boolean; atEnd: boolean } | null = null;
function onTouchStart(e: TouchEvent) {
  const el = scroller.value;
  const t = e.touches[0];
  if (!el || !t) return;
  touch = {
    x: t.clientX,
    atStart: el.scrollLeft <= 1,
    atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
  };
}
function onTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0];
  const start = touch;
  touch = null;
  if (!start || !t) return;
  const dx = t.clientX - start.x;
  if (start.atStart && dx > 56 && props.canPrev) emit('year', -1);
  else if (start.atEnd && dx < -56 && props.canNext) emit('year', 1);
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between pb-1">
      <button
        type="button"
        :disabled="!canPrev"
        :aria-label="`Tahun ${year - 1}`"
        class="grid size-8 place-items-center rounded-full text-primary-accent active:bg-fill-press disabled:opacity-30"
        @click="emit('year', -1)"
      >
        <ChevronLeft class="size-[18px]" stroke-width="2.6" aria-hidden="true" />
      </button>
      <b class="text-label tabular-nums" aria-live="polite">{{ year }}</b>
      <button
        type="button"
        :disabled="!canNext"
        :aria-label="`Tahun ${year + 1}`"
        class="grid size-8 place-items-center rounded-full text-primary-accent active:bg-fill-press disabled:opacity-30"
        @click="emit('year', 1)"
      >
        <ChevronRight class="size-[18px]" stroke-width="2.6" aria-hidden="true" />
      </button>
    </div>
    <div
      ref="scroller"
      class="year-scroller overflow-x-auto overscroll-x-contain"
      @pointerdown.stop
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.year-scroller {
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.year-scroller::-webkit-scrollbar {
  display: none;
}
</style>
