<script setup lang="ts">
// Roda gulir seperti pengatur alarm iOS: satu kolom angka yang diputar dengan
// jari / roda mouse, berhenti tepat di baris tengah (scroll-snap). Angka
// berulang tanpa ujung: daftar digandakan dan posisi diam-diam dikembalikan ke
// salinan tengah setelah gulir berhenti. Panah ↑ ↓ mengubah nilai satu langkah.
const props = withDefaults(
  defineProps<{
    /** Jumlah nilai: 0 … count-1 */
    count: number;
    label: string;
    /** Tinggi satu baris (px) */
    itemHeight?: number;
    /** Baris terlihat (ganjil): tengah + sisanya di atas & bawah */
    visible?: number;
  }>(),
  { itemHeight: 34, visible: 3 },
);
const model = defineModel<number>({ required: true });

const COPIES = 5;
const MIDDLE = Math.floor(COPIES / 2);
const pad = (n: number) => String(n).padStart(2, '0');

const el = ref<HTMLElement>();
const items = computed(() => Array.from({ length: props.count * COPIES }, (_, i) => i));
const edge = computed(() => ((props.visible - 1) / 2) * props.itemHeight);
const copyHeight = computed(() => props.count * props.itemHeight);

/** Indeks baris yang sedang di tengah */
const centered = ref(MIDDLE * props.count + model.value);
const normalize = (n: number) => ((n % props.count) + props.count) % props.count;

function scrollToIndex(index: number, smooth = false) {
  el.value?.scrollTo({ top: index * props.itemHeight, behavior: smooth ? 'smooth' : 'instant' });
}

function onScroll() {
  const box = el.value;
  if (!box) return;
  const index = Math.round(box.scrollTop / props.itemHeight);
  if (index !== centered.value) {
    centered.value = index;
    const value = normalize(index);
    if (value !== model.value) model.value = value;
  }
  scheduleRecenter();
}

/** Jari masih menempel: jangan pindahkan posisi gulir di bawahnya */
let holding = false;
function hold() {
  holding = true;
}
function release() {
  holding = false;
  scheduleRecenter();
}

let settleTimer: ReturnType<typeof setTimeout> | undefined;
/** Setelah berhenti: kembali ke salinan tengah supaya bisa diputar terus */
function scheduleRecenter() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    const box = el.value;
    if (!box || holding) return;
    // Masih meluncur / belum tepat di satu baris: tunggu lagi
    if (Math.abs(box.scrollTop - centered.value * props.itemHeight) > 1) {
      scheduleRecenter();
      return;
    }
    const copy = Math.floor(centered.value / props.count);
    if (copy === MIDDLE) return;
    box.scrollTop += (MIDDLE - copy) * copyHeight.value;
    centered.value += (MIDDLE - copy) * props.count;
  }, 160);
}
onBeforeUnmount(() => clearTimeout(settleTimer));

// Nilai berubah dari luar (chip jam cepat): putar ke baris terdekat
watch(model, (value) => {
  if (normalize(centered.value) === value) return;
  const base = centered.value - normalize(centered.value);
  let target = base + value;
  // Pilih arah terpendek
  if (target - centered.value > props.count / 2) target -= props.count;
  if (centered.value - target > props.count / 2) target += props.count;
  centered.value = target;
  scrollToIndex(target, true);
});

onMounted(() => scrollToIndex(centered.value));

function pick(index: number) {
  scrollToIndex(index, true);
}
function onKeydown(event: KeyboardEvent) {
  const delta = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[event.key];
  if (!delta) return;
  event.preventDefault();
  // Hitung dari posisi roda (model baru terbarui setelah render), langsung lompat
  centered.value += delta;
  scrollToIndex(centered.value);
  model.value = normalize(centered.value);
  scheduleRecenter();
}
</script>

<template>
  <div
    ref="el"
    role="spinbutton"
    tabindex="0"
    :aria-label="label"
    :aria-valuenow="model"
    aria-valuemin="0"
    :aria-valuemax="count - 1"
    :aria-valuetext="pad(model)"
    class="wheel overflow-y-auto overscroll-contain outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-primary/40"
    :style="{
      height: `${visible * itemHeight}px`,
      paddingBlock: `${edge}px`,
    }"
    @scroll.passive="onScroll"
    @touchstart.passive="hold"
    @touchend.passive="release"
    @touchcancel.passive="release"
    @keydown="onKeydown"
  >
    <div
      v-for="i in items"
      :key="i"
      aria-hidden="true"
      :class="[
        'wheel-item flex items-center justify-center tabular-nums transition-[color,opacity] duration-100',
        i === centered ? 'font-semibold text-foreground' : 'text-muted-foreground',
      ]"
      :style="{ height: `${itemHeight}px` }"
      @click="pick(i)"
    >
      {{ pad(i % count) }}
    </div>
  </div>
</template>

<style scoped>
.wheel {
  scroll-snap-type: y mandatory;
  /* Baris memudar ke atas dan bawah seperti roda */
  mask-image: linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent);
}
.wheel::-webkit-scrollbar {
  display: none;
}
.wheel-item {
  scroll-snap-align: center;
  font-size: 21px;
  cursor: pointer;
  user-select: none;
}
</style>
