<script setup lang="ts">
import { PiggyBank } from '@lucide/vue';
import Toaster from '@/components/base/Toaster.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import Dock from '@/components/ios/Dock.vue';
import IosAlert from '@/components/ios/IosAlert.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSwitch from '@/components/ios/IosSwitch.vue';
import SummaryStrip from '@/components/ios/SummaryStrip.vue';
import Keypad from '@/components/money/Keypad.vue';
import { useBudgetMonth } from '@/features/budgets/useBudgetMonth';
import { useBudgetMutations, useBudgetStatus } from '@/features/budgets/useBudgets';
import { useCategories } from '@/features/categories/useCategories';
import {
  evaluate,
  expressionLabel,
  fromAmount,
  hasOperator,
  keyFromKeyboard,
  press,
  type CalcKey,
} from '@/features/transactions/calculator';
import { formatRupiah } from '@/lib/format';
import { MONTHS_LONG } from '@/lib/time';

// Isi nominal budget (mockup budget-amount + budget-detail): halaman penuh
// dengan papan angka berkalkulator. Terpakai dan sisa bulan ini di atas.
// /stats/budget/total/edit atau /stats/budget/<id kategori>/edit, ?month=2026-10.
// Nominal baru berlaku mulai bulan itu; hapus = semua bulan (dialog).
definePageMeta({ layout: false });
if (useBreakpoint().md.value) setPageLayout('app');

const route = useRoute();
const { ym, year, month } = useBudgetMonth();
const fromQuery = String(route.query.month ?? '').match(/^(\d{4})-(\d{2})$/);
if (fromQuery) ym.value = { year: Number(fromQuery[1]), month: Number(fromQuery[2]) };
const { query, views } = useBudgetStatus(year, month);
const categories = useCategories();
const mutations = useBudgetMutations();
const toast = useToast();
const alert = useAlert();
const { closePage } = useFormPage();
const back = () => closePage('/stats/budget');

const key = computed(() => String(route.params.key));
const categoryId = computed(() => (key.value === 'total' ? null : key.value));
const budget = computed(
  () => views.value.find((v) => (v.category_id ?? 'total') === key.value) ?? null,
);
const title = computed(() =>
  categoryId.value ? categories.label(categoryId.value, true) || 'Budget' : 'Semua pengeluaran',
);
const style = computed(() =>
  categoryId.value
    ? categories.style(categoryId.value)
    : { icon: PiggyBank, tone: 'primary' as const },
);
useHead({ title: () => `Budget ${title.value} · Money Manager` });

const tokens = ref<string[]>([]);
const carryOver = ref(false);
const keypad = ref(true);
let loaded = false;
watch(
  () => query.isPending.value,
  (pending) => {
    if (pending || loaded) return;
    loaded = true;
    tokens.value = fromAmount(budget.value?.amount ?? 0);
    carryOver.value = budget.value?.carry_over ?? false;
    keypad.value = !budget.value;
  },
  { immediate: true },
);
const amount = computed(() => evaluate(tokens.value));
const expr = computed(() => expressionLabel(tokens.value));

function onKey(k: CalcKey) {
  if (k === '=' && !hasOperator(tokens.value)) {
    keypad.value = false;
    return;
  }
  tokens.value = press(tokens.value, k);
}
function onKeydown(event: KeyboardEvent) {
  if (!keypad.value || event.metaKey || event.ctrlKey) return;
  const k = event.key === 'Enter' ? '=' : keyFromKeyboard(event.key);
  if (!k) return;
  event.preventDefault();
  onKey(k);
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

const monthLabel = computed(() => `${MONTHS_LONG[month.value - 1]} ${year.value}`);

function save() {
  if (amount.value <= 0) return;
  mutations.set.mutate(
    {
      categoryId: categoryId.value,
      amount: amount.value,
      carryOver: carryOver.value,
      startOn: `${year.value}-${String(month.value).padStart(2, '0')}-01`,
    },
    { onSuccess: () => toast.show(`Budget ${title.value} disimpan`) },
  );
  back();
}

async function remove() {
  const ok = await alert.confirm({
    title: `Hapus budget ${title.value}?`,
    body: 'Budget ini dihapus di semua bulan. Transaksinya tidak ikut terhapus.',
    okLabel: 'Hapus',
    danger: true,
  });
  if (!ok) return;
  mutations.remove.mutate(categoryId.value, {
    onSuccess: () => toast.show(`Budget ${title.value} dihapus`),
  });
  back();
}
</script>

<template>
  <div data-page-stage class="flex min-h-dvh flex-col bg-background">
    <header
      class="sticky top-0 z-30 bg-card pt-[env(safe-area-inset-top,0px)] shadow-[0_0.5px_0_var(--sep)]"
    >
      <div class="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-1">
        <button
          type="button"
          class="h-11 justify-self-start px-3 text-bar text-primary-accent active:opacity-50"
          @click="back"
        >
          Batal
        </button>
        <h1
          class="m-0 flex items-center gap-1.5 truncate text-bar font-semibold tracking-[-0.02em]"
        >
          <ToneIcon :icon="style.icon" :tone="style.tone" size="xs" />{{ title }}
        </h1>
        <span />
      </div>
    </header>

    <SummaryStrip
      v-if="budget"
      :items="[
        { label: 'Budget', value: formatRupiah(budget.limit) },
        { label: 'Terpakai', value: formatRupiah(budget.spent), tone: 'exp' },
        {
          label: 'Sisa',
          value: formatRupiah(budget.remaining),
          tone: budget.remaining < 0 ? 'exp' : undefined,
        },
      ]"
    />

    <main :class="['mx-auto w-full max-w-[560px] flex-1', keypad && 'pb-[360px]']">
      <button
        type="button"
        :aria-expanded="keypad"
        class="flex w-full flex-col items-center gap-1 bg-card px-5 pb-4 pt-6"
        @click="keypad = true"
      >
        <span class="text-meta text-muted-foreground">Batas per bulan mulai {{ monthLabel }}</span>
        <span class="min-h-[17px] text-meta text-muted-foreground">{{ keypad ? expr : '' }}</span>
        <span class="flex items-center text-[32px] font-bold tracking-[-0.03em]">
          {{ formatRupiah(amount) }}
          <span v-if="keypad" class="budget-caret" aria-hidden="true" />
        </span>
      </button>

      <div class="mx-4 mt-3.5 overflow-hidden rounded-group bg-card">
        <div class="flex min-h-12 items-center gap-3 py-2 pl-4 pr-3.5">
          <span class="flex min-w-0 flex-1 flex-col">
            <b class="text-row font-medium">Bawa sisa ke bulan berikutnya</b>
            <span class="text-meta text-muted-foreground"
              >Sisa bulan lalu ditambahkan ke batas bulan ini</span
            >
          </span>
          <IosSwitch v-model="carryOver" label="Bawa sisa ke bulan berikutnya" />
        </div>
      </div>

      <div v-if="!keypad" class="flex flex-col gap-2.5 px-4 pt-[18px]">
        <IosButton block :disabled="amount <= 0" @click="save">Simpan</IosButton>
        <IosButton v-if="budget" block variant="red" @click="remove">Hapus budget</IosButton>
      </div>
      <p class="mx-8 mt-3 text-meta text-muted-foreground">
        Bulan sebelum {{ monthLabel }} tetap memakai nominal lama.
      </p>
    </main>

    <Dock
      v-if="keypad"
      title="Nominal"
      hint="+ − × ÷ bisa dipakai untuk menghitung"
      @close="keypad = false"
    >
      <Keypad :has-operator="hasOperator(tokens)" @press="onKey" />
    </Dock>
    <Toaster />
    <IosAlert />
  </div>
</template>

<style scoped>
.budget-caret {
  display: inline-block;
  width: 2px;
  height: 30px;
  margin-left: 3px;
  border-radius: 2px;
  background: var(--primary-accent);
  animation: budget-blink 1.1s steps(1) infinite;
}
@keyframes budget-blink {
  50% {
    opacity: 0;
  }
}
</style>
