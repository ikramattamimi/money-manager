<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import FormField from '@/components/base/FormField.vue';
import Switch from '@/components/base/Switch.vue';
import GridPicker from '@/components/data/GridPicker.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import { TONE_TEXT } from '@/components/data/tone';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import type { RecurringFrequency, RecurringRule } from '@/features/recurring/api';
import { installmentPlan } from '@/features/recurring/installment';
import { FREQUENCY_LABEL, useRecurringMutations } from '@/features/recurring/useRecurring';
import type { TxType } from '@/features/transactions/api';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import { dayKey } from '@/lib/time';

// Aturan transaksi berulang. Dicatat oleh database setiap pagi 07.00 WIB
// (pg_cron), tidak bergantung pada app dibuka. "Tanya dulu" = masuk daftar
// Perlu dikonfirmasi di halaman Transaksi.
const props = defineProps<{ rule: RecurringRule | null; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { bookId } = useActiveBook();
const { byId: accountById, active: accounts } = useAccounts();
const categories = useCategories();
const pickerItems = usePickerItems();
const mutations = useRecurringMutations();
const toast = useToast();

const r = props.rule;
const today = dayKey(new Date());
const form = reactive({
  name: r?.name ?? '',
  type: (r?.type ?? 'expense') as TxType,
  amount: r?.amount ?? 0,
  accountId: r?.account_id ?? accounts.value[0]?.id ?? '',
  toAccountId: r?.to_account_id ?? '',
  fee: r?.fee ?? 0,
  categoryId: r?.category_id ?? '',
  note: r?.note ?? '',
  frequency: (r?.frequency ?? 'monthly') as RecurringFrequency,
  interval: r?.interval ?? 1,
  dayOfMonth: r?.day_of_month ?? null,
  startOn: r?.start_on ?? today,
  endOn: r?.end_on ?? '',
  autoPost: r?.auto_post ?? true,
  active: r?.active ?? true,
});
const errors = reactive<Record<string, string>>({});

// Cicilan: total dibagi N bulan, aturan bulanan yang berhenti di cicilan ke-N
const installment = reactive({ on: false, total: 0, months: 3 });
const plan = computed(() =>
  installment.on
    ? installmentPlan(installment.total, installment.months, form.startOn, form.dayOfMonth ?? 1)
    : null,
);
watch(plan, (p) => {
  if (!p) return;
  form.frequency = 'monthly';
  form.interval = 1;
  form.amount = p.amount;
  form.endOn = p.endOn;
});
watch(
  () => installment.on,
  (on) => {
    if (on && !form.name.trim()) form.name = 'Cicilan ';
    if (!on) form.endOn = '';
  },
);

const TYPES = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
] as const;
const FREQUENCIES = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
] as const;

watch(
  () => form.type,
  (type) => {
    const c = categories.byId.value.get(form.categoryId);
    if (type === 'transfer' || (c && c.kind !== type)) form.categoryId = '';
  },
);
// Tanggal bulanan mengikuti tanggal mulai, kecuali diisi sendiri
watch(
  () => form.startOn,
  (start) => {
    if (!r && start) form.dayOfMonth = Number(start.slice(8, 10));
  },
  { immediate: true },
);

type Picker = 'category' | 'account' | 'to';
const picker = ref<Picker | null>(null);
const PICKER_TITLE: Record<Picker, string> = {
  category: 'Kategori',
  account: 'Akun',
  to: 'Akun tujuan',
};
const items = computed(() => {
  if (picker.value === 'category')
    return form.type === 'transfer' ? [] : pickerItems.categoryItems(form.type);
  return pickerItems.accountItems(picker.value === 'to' ? form.accountId : null);
});
function choose(id: string) {
  if (picker.value === 'category') form.categoryId = id;
  else if (picker.value === 'account') {
    form.accountId = id;
    if (form.toAccountId === id) form.toAccountId = '';
  } else form.toAccountId = id;
  picker.value = null;
}
const accountName = (id: string) => accountById.value.get(id)?.name ?? '';
const categoryStyle = computed(() => (form.categoryId ? categories.style(form.categoryId) : null));

const summary = computed(() => {
  const f = FREQUENCY_LABEL[form.frequency];
  const every = form.interval > 1 ? `Setiap ${form.interval} ${f.unit}` : f.one;
  if (form.frequency === 'monthly' && form.dayOfMonth)
    return `${every}, tanggal ${form.dayOfMonth}${form.dayOfMonth > 28 ? ' (atau tanggal terakhir di bulan yang lebih pendek)' : ''}`;
  return every;
});

function save() {
  for (const key of Object.keys(errors)) Reflect.deleteProperty(errors, key);
  if (!form.name.trim()) errors.name = 'Isi nama, mis. Kos atau Spotify.';
  if (form.amount <= 0) errors.amount = 'Isi nominal lebih dari 0.';
  if (!form.accountId) errors.accountId = 'Pilih akun.';
  if (form.type === 'transfer' && !form.toAccountId) errors.toAccountId = 'Pilih akun tujuan.';
  if (!form.startOn) errors.startOn = 'Isi tanggal mulai.';
  if (installment.on && !plan.value)
    errors.installment = 'Isi total cicilan dan jumlah bulan (minimal 2).';
  if (form.endOn && form.endOn < form.startOn)
    errors.endOn = 'Tanggal akhir sebelum tanggal mulai.';
  if (form.interval < 1 || form.interval > 365) errors.interval = 'Isi 1–365.';
  if (
    form.frequency === 'monthly' &&
    (!form.dayOfMonth || form.dayOfMonth < 1 || form.dayOfMonth > 31)
  )
    errors.dayOfMonth = 'Isi tanggal 1–31.';
  if (Object.keys(errors).length || !bookId.value) return;

  const transfer = form.type === 'transfer';
  const data = {
    name: form.name.trim(),
    type: form.type,
    amount: form.amount,
    account_id: form.accountId,
    to_account_id: transfer ? form.toAccountId : null,
    fee: transfer ? form.fee : 0,
    category_id: transfer ? null : form.categoryId || null,
    note: form.note.trim(),
    frequency: form.frequency,
    interval: form.interval,
    day_of_month: form.frequency === 'monthly' ? form.dayOfMonth : null,
    start_on: form.startOn,
    end_on: form.endOn || null,
    auto_post: form.autoPost,
    active: form.active,
  };
  if (r) {
    mutations.update.mutate({ id: r.id, patch: data }, { onSuccess: () => toast.show('Disimpan') });
  } else {
    // next_run_on dihitung trigger database dari tanggal mulai
    mutations.create.mutate(
      { ...data, book_id: bookId.value, next_run_on: form.startOn },
      { onSuccess: () => toast.show(`${data.name} ditambahkan`) },
    );
  }
  emit('close');
}

// Hapus: transaksi yang sudah tercatat tetap ada. Dua kali tap supaya tidak
// tidak sengaja (membuat ulang aturan bisa mencatat ulang tanggal lama).
const confirmDelete = ref(false);
function remove() {
  if (!r) return;
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  mutations.remove.mutate(r.id, { onSuccess: () => toast.show(`${r.name} dihapus`) });
  emit('close');
}
</script>

<template>
  <form class="flex flex-col gap-3.5" novalidate @submit.prevent="save">
    <div v-if="!page" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ rule ? 'Ubah transaksi berulang' : 'Transaksi berulang baru' }}
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

    <SegmentedControl v-model="form.type" :options="TYPES" label="Jenis transaksi" />

    <template v-if="!rule && form.type === 'expense'">
      <Switch
        id="rr-installment"
        v-model="installment.on"
        label="Cicilan"
        description="Total dibagi rata per bulan dan berhenti sendiri setelah cicilan terakhir."
      />
      <div v-if="installment.on" class="grid grid-cols-2 gap-3">
        <FormField label="Total cicilan" for="rr-total" :error="errors.installment">
          <AmountInput id="rr-total" v-model="installment.total" />
        </FormField>
        <FormField label="Berapa bulan" for="rr-months">
          <input
            id="rr-months"
            v-model.number="installment.months"
            type="number"
            inputmode="numeric"
            min="2"
            max="60"
            class="field-input"
          />
        </FormField>
        <p v-if="plan" class="col-span-2 m-0 -mt-1.5 text-xs text-muted-foreground">
          {{ installment.months }} × {{ plan.amount.toLocaleString('id-ID') }}, terakhir
          {{ plan.endOn.split('-').reverse().join('/') }}.<template v-if="plan.rounding">
            Total tercatat {{ (plan.amount * installment.months).toLocaleString('id-ID') }} (selisih
            pembulatan {{ Math.abs(plan.rounding).toLocaleString('id-ID') }}).</template
          >
        </p>
      </div>
    </template>

    <div class="grid gap-3 sm:grid-cols-2">
      <FormField label="Nama" for="rr-name" :error="errors.name">
        <input
          id="rr-name"
          v-model="form.name"
          type="text"
          maxlength="60"
          class="field-input"
          autocomplete="off"
          placeholder="mis. Kos, Spotify"
          :aria-invalid="!!errors.name || undefined"
        />
      </FormField>
      <FormField label="Nominal" for="rr-amount" :error="errors.amount">
        <AmountInput id="rr-amount" v-model="form.amount" :invalid="!!errors.amount" />
      </FormField>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <FormField v-if="form.type !== 'transfer'" label="Kategori" for="rr-category">
        <button
          id="rr-category"
          type="button"
          class="field-input flex items-center gap-2 text-left"
          @click="picker = picker === 'category' ? null : 'category'"
        >
          <component
            :is="categoryStyle.icon"
            v-if="categoryStyle"
            :class="['size-4 shrink-0', TONE_TEXT[categoryStyle.tone]]"
            aria-hidden="true"
          />
          <span :class="['truncate', !form.categoryId && 'text-faint']">
            {{ form.categoryId ? categories.label(form.categoryId, true) : 'Tanpa kategori' }}
          </span>
        </button>
      </FormField>
      <FormField
        :label="form.type === 'transfer' ? 'Dari akun' : 'Akun'"
        for="rr-account"
        :error="errors.accountId"
      >
        <button
          id="rr-account"
          type="button"
          class="field-input flex items-center text-left"
          @click="picker = picker === 'account' ? null : 'account'"
        >
          <span :class="['truncate', !form.accountId && 'text-faint']">{{
            accountName(form.accountId) || 'Pilih akun'
          }}</span>
        </button>
      </FormField>
      <FormField
        v-if="form.type === 'transfer'"
        label="Ke akun"
        for="rr-to"
        :error="errors.toAccountId"
      >
        <button
          id="rr-to"
          type="button"
          class="field-input flex items-center text-left"
          @click="picker = picker === 'to' ? null : 'to'"
        >
          <span :class="['truncate', !form.toAccountId && 'text-faint']">{{
            accountName(form.toAccountId) || 'Pilih akun tujuan'
          }}</span>
        </button>
      </FormField>
    </div>

    <section
      v-if="picker"
      class="overflow-hidden rounded-xl border"
      :aria-label="PICKER_TITLE[picker]"
    >
      <div class="flex items-center gap-2 border-b bg-surface-2 py-1 pl-3.5 pr-1">
        <b class="flex-1 text-label">{{ PICKER_TITLE[picker] }}</b>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          class="press-icon"
          aria-label="Tutup pilihan"
          @click="picker = null"
        >
          <X />
        </Button>
      </div>
      <div class="max-h-[46dvh] overflow-y-auto overscroll-contain">
        <GridPicker
          :key="picker + form.type"
          :items="items"
          :model-value="
            picker === 'category'
              ? form.categoryId
              : picker === 'to'
                ? form.toAccountId
                : form.accountId
          "
          :label="PICKER_TITLE[picker]"
          @select="choose"
        />
      </div>
    </section>

    <FormField v-if="form.type === 'transfer'" label="Biaya admin" for="rr-fee">
      <AmountInput id="rr-fee" v-model="form.fee" />
    </FormField>

    <fieldset class="m-0 flex flex-col gap-3 rounded-xl border p-3">
      <legend class="px-1 text-label font-semibold">Jadwal</legend>
      <SegmentedControl v-model="form.frequency" :options="FREQUENCIES" label="Frekuensi" />
      <div class="grid grid-cols-2 gap-3">
        <FormField
          :label="`Setiap berapa ${FREQUENCY_LABEL[form.frequency].unit}`"
          for="rr-interval"
          :error="errors.interval"
        >
          <input
            id="rr-interval"
            v-model.number="form.interval"
            type="number"
            inputmode="numeric"
            min="1"
            max="365"
            class="field-input"
          />
        </FormField>
        <FormField
          v-if="form.frequency === 'monthly'"
          label="Tanggal"
          for="rr-day"
          :error="errors.dayOfMonth"
        >
          <input
            id="rr-day"
            v-model.number="form.dayOfMonth"
            type="number"
            inputmode="numeric"
            min="1"
            max="31"
            class="field-input"
          />
        </FormField>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Mulai" for="rr-start" :error="errors.startOn">
          <input id="rr-start" v-model="form.startOn" type="date" class="field-input" />
        </FormField>
        <FormField label="Sampai (opsional)" for="rr-end" :error="errors.endOn">
          <input
            id="rr-end"
            v-model="form.endOn"
            type="date"
            :min="form.startOn"
            class="field-input"
          />
        </FormField>
      </div>
      <p class="m-0 text-meta text-muted-foreground">{{ summary }}.</p>
    </fieldset>

    <Switch
      id="rr-auto"
      v-model="form.autoPost"
      label="Catat otomatis"
      description="Matikan untuk ditanya dulu di halaman Transaksi (cocok kalau nominalnya bisa berubah)."
    />
    <Switch
      v-if="rule"
      id="rr-active"
      v-model="form.active"
      label="Aktif"
      description="Matikan untuk berhenti sementara."
    />

    <FormField label="Catatan" for="rr-note" hint="Kosong = pakai nama.">
      <input
        id="rr-note"
        v-model="form.note"
        type="text"
        maxlength="120"
        class="field-input"
        autocomplete="off"
      />
    </FormField>

    <div :class="['flex flex-wrap items-center gap-2 pt-1', page && 'form-page-actions']">
      <Button v-if="rule" type="button" variant="ghost-danger" size="touch" @click="remove">
        <Trash2 />{{ confirmDelete ? 'Yakin hapus?' : 'Hapus' }}
      </Button>
      <span class="flex-1" />
      <Button type="submit" size="touch">{{ rule ? 'Simpan perubahan' : 'Tambah' }}</Button>
    </div>
  </form>
</template>
