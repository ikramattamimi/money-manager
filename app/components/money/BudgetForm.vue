<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import FormField from '@/components/base/FormField.vue';
import Switch from '@/components/base/Switch.vue';
import GridPicker, { type GridItem } from '@/components/data/GridPicker.vue';
import { TONE_TEXT } from '@/components/data/tone';
import { Button } from '@/components/ui/button';
import type { BudgetView } from '@/features/budgets/useBudgets';
import { useBudgetMutations } from '@/features/budgets/useBudgets';
import { useCategories } from '@/features/categories/useCategories';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import { MONTHS_LONG } from '@/lib/time';

// Atur budget bulanan: total atau per kategori pengeluaran. Nominal baru
// berlaku mulai bulan yang sedang dilihat; bulan sebelumnya tidak berubah.
const props = defineProps<{
  budget: BudgetView | null;
  year: number;
  month: number;
  /** Kategori yang sudah punya budget (tidak bisa dipilih lagi) */
  taken: (string | null)[];
  titleId: string;
  page?: boolean;
}>();
const emit = defineEmits<{ close: [] }>();

const mutations = useBudgetMutations();
const categories = useCategories();
const pickerItems = usePickerItems();
const toast = useToast();

const TOTAL = 'total';
const form = reactive({
  target: props.budget ? (props.budget.category_id ?? TOTAL) : '',
  amount: props.budget?.amount ?? 0,
  carryOver: props.budget?.carry_over ?? false,
});
const errors = reactive<Record<string, string>>({});
const picking = ref(!props.budget);

const takenSet = computed(() => new Set(props.taken.map((t) => t ?? TOTAL)));
const items = computed<GridItem[]>(() => {
  const mark = (item: GridItem): GridItem => ({
    ...item,
    disabled: takenSet.value.has(item.id) && item.id !== form.target,
    hint: takenSet.value.has(item.id) && item.id !== form.target ? 'sudah ada' : item.hint,
    children: item.children?.map(mark),
  });
  return [
    { id: TOTAL, label: 'Semua pengeluaran', hint: 'budget total' },
    ...pickerItems.categoryItems('expense').filter((i) => i.id !== ''),
  ].map(mark);
});
const targetLabel = computed(() =>
  form.target === TOTAL
    ? 'Semua pengeluaran'
    : form.target
      ? categories.label(form.target, true)
      : '',
);
const targetStyle = computed(() =>
  form.target && form.target !== TOTAL ? categories.style(form.target) : null,
);

function choose(id: string) {
  form.target = id;
  picking.value = false;
}

const startOn = computed(() => `${props.year}-${String(props.month).padStart(2, '0')}-01`);

function save() {
  for (const key of Object.keys(errors)) Reflect.deleteProperty(errors, key);
  if (!form.target) errors.target = 'Pilih kategori atau Semua pengeluaran.';
  if (form.amount <= 0) errors.amount = 'Isi nominal lebih dari 0.';
  if (Object.keys(errors).length) return;
  const label = targetLabel.value;
  mutations.set.mutate(
    {
      categoryId: form.target === TOTAL ? null : form.target,
      amount: form.amount,
      carryOver: form.carryOver,
      startOn: startOn.value,
    },
    { onSuccess: () => toast.show(`Budget ${label} disimpan`) },
  );
  emit('close');
}

// Hapus untuk semua bulan: dua kali tap supaya tidak tidak sengaja
const confirmDelete = ref(false);
function remove() {
  if (!props.budget) return;
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  const label = targetLabel.value;
  mutations.remove.mutate(props.budget.category_id, {
    onSuccess: () => toast.show(`Budget ${label} dihapus`),
  });
  emit('close');
}
</script>

<template>
  <form class="flex flex-col gap-3.5" novalidate @submit.prevent="save">
    <div v-if="!page" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ budget ? 'Ubah budget' : 'Budget baru' }}
      </h2>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Tutup"
        class="press-icon"
        type="button"
        @click="emit('close')"
      >
        <X />
      </Button>
    </div>

    <FormField label="Untuk" for="budget-target" :error="errors.target">
      <button
        id="budget-target"
        type="button"
        class="field-input flex items-center gap-2 text-left"
        :disabled="!!budget"
        :aria-expanded="picking"
        @click="picking = !picking"
      >
        <component
          :is="targetStyle.icon"
          v-if="targetStyle"
          :class="['size-4 shrink-0', TONE_TEXT[targetStyle.tone]]"
          aria-hidden="true"
        />
        <span :class="['truncate', !form.target && 'text-faint']">{{
          targetLabel || 'Pilih kategori'
        }}</span>
      </button>
    </FormField>

    <section
      v-if="picking && !budget"
      class="overflow-hidden rounded-xl border"
      aria-label="Pilih kategori budget"
    >
      <div class="max-h-[46dvh] overflow-y-auto overscroll-contain">
        <GridPicker
          :items="items"
          :model-value="form.target"
          label="Kategori budget"
          @select="choose"
        />
      </div>
    </section>

    <FormField
      label="Batas per bulan"
      for="budget-amount"
      :error="errors.amount"
      :hint="`Berlaku mulai ${MONTHS_LONG[month - 1]} ${year}. Bulan sebelumnya tidak berubah.`"
    >
      <AmountInput id="budget-amount" v-model="form.amount" :invalid="!!errors.amount" />
    </FormField>

    <Switch
      id="budget-carry"
      v-model="form.carryOver"
      label="Bawa sisa ke bulan berikutnya"
      description="Sisa budget bulan lalu ditambahkan ke batas bulan ini."
    />

    <div :class="['flex flex-wrap items-center gap-2 pt-1', page && 'form-page-actions']">
      <Button v-if="budget" type="button" variant="ghost-danger" size="touch" @click="remove">
        <Trash2 />{{ confirmDelete ? 'Hapus di semua bulan?' : 'Hapus' }}
      </Button>
      <span class="flex-1" />
      <Button type="submit" size="touch">Simpan</Button>
    </div>
  </form>
</template>
