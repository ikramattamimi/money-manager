<script setup lang="ts">
import FieldRow from '@/components/data/FieldRow.vue';
import FormGroup from '@/components/data/FormGroup.vue';
import InlineAmount from '@/components/data/InlineAmount.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { FIELD_BUTTON, FIELD_INPUT } from '@/components/data/field';
import GroupRow from '@/components/ios/GroupRow.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import IosSwitch from '@/components/ios/IosSwitch.vue';
import Segmented from '@/components/ios/Segmented.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import type { RecurringFrequency, RecurringRule } from '@/features/recurring/api';
import { installmentPlan } from '@/features/recurring/installment';
import { FREQUENCY_LABEL, useRecurringMutations } from '@/features/recurring/useRecurring';
import type { TxType } from '@/features/transactions/api';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import { dayKey } from '@/lib/time';
import ChoiceGrid from './ChoiceGrid.vue';
import FormDialogHeader from './FormDialogHeader.vue';

// Aturan Ulangi & cicilan. Dicatat oleh database setiap pagi 07.00 WIB
// (pg_cron), tidak bergantung pada app dibuka. "Tanya dulu" = masuk daftar
// Perlu dikonfirmasi di halaman Transaksi. Kategori/akun dipilih di lembar
// bawah dengan grid 4 kolom. `page` = di dalam FormPage (Simpan di bar
// halaman, form id `${titleId}-form`); selain itu kepala dialog sendiri.
const props = defineProps<{ rule: RecurringRule | null; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { bookId } = useActiveBook();
const { byId: accountById, active: accounts } = useAccounts();
const categories = useCategories();
const pickerItems = usePickerItems();
const mutations = useRecurringMutations();
const toast = useToast();
const alert = useAlert();

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
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
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
const pickerOpen = computed({
  get: () => picker.value !== null,
  set: (v) => !v && (picker.value = null),
});
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
const pickerValue = computed(() =>
  picker.value === 'category'
    ? form.categoryId
    : picker.value === 'to'
      ? form.toAccountId
      : form.accountId,
);
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

// Hapus: transaksi yang sudah tercatat tetap ada. Tidak bisa diurungkan
// (membuat ulang aturan bisa mencatat ulang tanggal lama), jadi lewat dialog.
async function remove() {
  if (!r) return;
  const ok = await alert.confirm({
    title: `Hapus ${r.name}?`,
    body: 'Aturan berhenti mencatat. Transaksi yang sudah tercatat tetap ada. Ini tidak bisa diurungkan.',
    okLabel: 'Hapus',
    danger: true,
  });
  if (!ok) return;
  mutations.remove.mutate(r.id, { onSuccess: () => toast.show(`${r.name} dihapus`) });
  emit('close');
}

const DATE_INPUT = `${FIELD_INPUT} appearance-none [&::-webkit-date-and-time-value]:text-right`;
const NUM_INPUT = `${FIELD_INPUT} max-w-[80px]`;
</script>

<template>
  <form
    :id="`${titleId}-form`"
    class="flex flex-col gap-3.5 pb-4"
    novalidate
    @submit.prevent="save"
  >
    <FormDialogHeader
      v-if="!page"
      :title="rule ? 'Ubah ulangi' : 'Ulangi baru'"
      :title-id="titleId"
      @close="emit('close')"
    />

    <Segmented v-model="form.type" :options="TYPES" label="Jenis transaksi" class="mt-1" />

    <FormGroup v-if="!rule && form.type === 'expense'" :page="page">
      <GroupRow
        title="Cicilan"
        subtitle="Total dibagi rata per bulan, berhenti sendiri setelah cicilan terakhir"
      >
        <template #end><IosSwitch v-model="installment.on" label="Cicilan" /></template>
      </GroupRow>
      <template v-if="installment.on">
        <FieldRow label="Total" for="rr-total" :error="errors.installment">
          <InlineAmount id="rr-total" v-model="installment.total" />
        </FieldRow>
        <FieldRow label="Berapa bulan" for="rr-months" :label-width="120">
          <input
            id="rr-months"
            v-model.number="installment.months"
            type="number"
            inputmode="numeric"
            min="2"
            max="60"
            :class="NUM_INPUT"
          />
        </FieldRow>
      </template>
      <template v-if="plan" #foot>
        {{ installment.months }} × {{ plan.amount.toLocaleString('id-ID') }}, terakhir
        {{ plan.endOn.split('-').reverse().join('/') }}.<template v-if="plan.rounding">
          Total tercatat {{ (plan.amount * installment.months).toLocaleString('id-ID') }} (selisih
          pembulatan {{ Math.abs(plan.rounding).toLocaleString('id-ID') }}).</template
        >
      </template>
    </FormGroup>

    <FormGroup :page="page">
      <FieldRow label="Nama" for="rr-name" :error="errors.name">
        <input
          id="rr-name"
          v-model="form.name"
          type="text"
          maxlength="60"
          :class="FIELD_INPUT"
          autocomplete="off"
          placeholder="mis. Kos, Spotify"
          :aria-invalid="!!errors.name || undefined"
        />
      </FieldRow>
      <FieldRow label="Nominal" for="rr-amount" :error="errors.amount">
        <InlineAmount id="rr-amount" v-model="form.amount" :invalid="!!errors.amount" />
      </FieldRow>
      <FieldRow v-if="form.type !== 'transfer'" label="Kategori" for="rr-category">
        <button
          id="rr-category"
          type="button"
          :class="[FIELD_BUTTON, !form.categoryId && 'text-muted-foreground']"
          @click="picker = 'category'"
        >
          <ToneIcon
            v-if="categoryStyle"
            :icon="categoryStyle.icon"
            :tone="categoryStyle.tone"
            size="xs"
          />
          <span class="truncate">{{
            form.categoryId ? categories.label(form.categoryId, true) : 'Tanpa kategori'
          }}</span>
        </button>
      </FieldRow>
      <FieldRow
        :label="form.type === 'transfer' ? 'Dari' : 'Akun'"
        for="rr-account"
        :error="errors.accountId"
      >
        <button
          id="rr-account"
          type="button"
          :class="[FIELD_BUTTON, !form.accountId && 'text-muted-foreground']"
          @click="picker = 'account'"
        >
          <span class="truncate">{{ accountName(form.accountId) || 'Pilih akun' }}</span>
        </button>
      </FieldRow>
      <template v-if="form.type === 'transfer'">
        <FieldRow label="Ke" for="rr-to" :error="errors.toAccountId">
          <button
            id="rr-to"
            type="button"
            :class="[FIELD_BUTTON, !form.toAccountId && 'text-muted-foreground']"
            @click="picker = 'to'"
          >
            <span class="truncate">{{ accountName(form.toAccountId) || 'Pilih akun tujuan' }}</span>
          </button>
        </FieldRow>
        <FieldRow label="Biaya admin" for="rr-fee" :label-width="112">
          <InlineAmount id="rr-fee" v-model="form.fee" />
        </FieldRow>
      </template>
    </FormGroup>

    <FormGroup label="Jadwal" :page="page" :foot="`${summary}.`">
      <GroupRow>
        <Segmented v-model="form.frequency" :options="FREQUENCIES" label="Frekuensi" />
      </GroupRow>
      <FieldRow
        :label="`Setiap (${FREQUENCY_LABEL[form.frequency].unit})`"
        for="rr-interval"
        :error="errors.interval"
        :label-width="150"
      >
        <input
          id="rr-interval"
          v-model.number="form.interval"
          type="number"
          inputmode="numeric"
          min="1"
          max="365"
          :class="NUM_INPUT"
        />
      </FieldRow>
      <FieldRow
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
          :class="NUM_INPUT"
        />
      </FieldRow>
      <FieldRow label="Mulai" for="rr-start" :error="errors.startOn">
        <input id="rr-start" v-model="form.startOn" type="date" :class="DATE_INPUT" />
      </FieldRow>
      <FieldRow label="Sampai" for="rr-end" :error="errors.endOn">
        <input
          id="rr-end"
          v-model="form.endOn"
          type="date"
          :min="form.startOn"
          :class="[DATE_INPUT, !form.endOn && 'text-ter']"
        />
      </FieldRow>
    </FormGroup>

    <FormGroup :page="page">
      <GroupRow title="Catat otomatis" subtitle="Matikan untuk ditanya dulu di halaman Transaksi">
        <template #end><IosSwitch v-model="form.autoPost" label="Catat otomatis" /></template>
      </GroupRow>
      <GroupRow v-if="rule" title="Aktif" subtitle="Matikan untuk berhenti sementara">
        <template #end><IosSwitch v-model="form.active" label="Aktif" /></template>
      </GroupRow>
      <FieldRow label="Catatan" for="rr-note">
        <input
          id="rr-note"
          v-model="form.note"
          type="text"
          maxlength="120"
          :class="FIELD_INPUT"
          autocomplete="off"
          placeholder="Kosong = pakai nama"
        />
      </FieldRow>
    </FormGroup>

    <IosButton v-if="rule" variant="red" block class="mt-2" @click="remove">Hapus aturan</IosButton>

    <IosSheet v-model:open="pickerOpen" :title="picker ? PICKER_TITLE[picker] : ''">
      <div class="overflow-hidden rounded-[14px] bg-[var(--kb-bg)]">
        <ChoiceGrid
          v-if="picker"
          :key="picker + form.type"
          :items="items"
          :model-value="pickerValue"
          :label="PICKER_TITLE[picker]"
          class="pb-1.5!"
          @select="choose"
        />
      </div>
    </IosSheet>
  </form>
</template>
