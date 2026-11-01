<script setup lang="ts">
import FieldRow from '@/components/data/FieldRow.vue';
import FormGroup from '@/components/data/FormGroup.vue';
import InlineAmount from '@/components/data/InlineAmount.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import { FIELD_BUTTON, FIELD_INPUT } from '@/components/data/field';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import Segmented from '@/components/ios/Segmented.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import type { Template } from '@/features/templates/api';
import { useTemplateMutations } from '@/features/templates/useTemplates';
import type { TxType } from '@/features/transactions/api';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import ChoiceGrid from './ChoiceGrid.vue';
import FormDialogHeader from './FormDialogHeader.vue';

// Tambah/ubah bookmark (tabel templates). Nominal boleh kosong: saat dipakai,
// form catat dibuka dengan papan angka. Bookmark bernominal tersimpan dengan
// satu ketuk. Hapus langsung jalan dengan Urungkan di toast.
// `page` = di dalam FormPage (Simpan di bar halaman, form id `${titleId}-form`).
const props = defineProps<{ template: Template | null; titleId: string; page?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { bookId } = useActiveBook();
const { byId: accountById } = useAccounts();
const categories = useCategories();
const pickerItems = usePickerItems();
const mutations = useTemplateMutations();
const toast = useToast();

const t = props.template;
const form = reactive({
  name: t?.name ?? '',
  type: (t?.type ?? 'expense') as TxType,
  amount: t?.amount ?? 0,
  accountId: t?.account_id ?? '',
  toAccountId: t?.to_account_id ?? '',
  categoryId: t?.category_id ?? '',
  note: t?.note ?? '',
});
const errors = reactive<Record<string, string>>({});

const TYPES = [
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'transfer', label: 'Transfer' },
] as const;

watch(
  () => form.type,
  (type) => {
    const c = categories.byId.value.get(form.categoryId);
    if (type === 'transfer' || (c && c.kind !== type)) form.categoryId = '';
  },
);

// Nama otomatis dari catatan/kategori selama belum diisi sendiri
const nameTouched = ref(!!t);
watch(
  () => [form.note, form.categoryId],
  () => {
    if (nameTouched.value) return;
    form.name = form.note.trim() || categories.label(form.categoryId) || '';
  },
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

function save() {
  for (const key of Object.keys(errors)) Reflect.deleteProperty(errors, key);
  if (!form.name.trim()) errors.name = 'Isi nama bookmark.';
  if (form.type === 'transfer') {
    if (!form.accountId) errors.accountId = 'Pilih akun asal.';
    if (!form.toAccountId) errors.toAccountId = 'Pilih akun tujuan.';
  }
  if (Object.keys(errors).length || !bookId.value) return;

  const transfer = form.type === 'transfer';
  const data = {
    name: form.name.trim(),
    type: form.type,
    amount: form.amount > 0 ? form.amount : null,
    account_id: form.accountId || null,
    to_account_id: transfer ? form.toAccountId || null : null,
    category_id: transfer ? null : form.categoryId || null,
    note: form.note.trim(),
  };
  if (t) {
    mutations.update.mutate(
      { id: t.id, patch: data },
      { onSuccess: () => toast.show('Bookmark disimpan') },
    );
  } else {
    mutations.create.mutate(
      { ...data, book_id: bookId.value },
      { onSuccess: () => toast.show(`Bookmark ${data.name} ditambahkan`) },
    );
  }
  emit('close');
}

function remove() {
  if (!t) return;
  mutations.remove.mutate(t);
  emit('close');
}
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
      :title="template ? 'Ubah bookmark' : 'Bookmark baru'"
      :title-id="titleId"
      @close="emit('close')"
    />

    <Segmented v-model="form.type" :options="TYPES" label="Jenis transaksi" class="mt-1" />

    <FormGroup
      :page="page"
      foot="Kosongkan nominal kalau berubah-ubah: papan angka dibuka saat dipakai."
    >
      <FieldRow label="Nama" for="tpl-name" :error="errors.name">
        <input
          id="tpl-name"
          v-model="form.name"
          type="text"
          maxlength="60"
          :class="FIELD_INPUT"
          autocomplete="off"
          placeholder="mis. Spotify"
          :aria-invalid="!!errors.name || undefined"
          @input="nameTouched = true"
        />
      </FieldRow>
      <FieldRow label="Nominal" for="tpl-amount">
        <InlineAmount id="tpl-amount" v-model="form.amount" placeholder="Tanya saat dipakai" />
      </FieldRow>
      <FieldRow v-if="form.type !== 'transfer'" label="Kategori" for="tpl-category">
        <button
          id="tpl-category"
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
        for="tpl-account"
        :error="errors.accountId"
      >
        <button
          id="tpl-account"
          type="button"
          :class="[FIELD_BUTTON, !form.accountId && 'text-muted-foreground']"
          @click="picker = 'account'"
        >
          <span class="truncate">{{ accountName(form.accountId) || 'Akun terakhir dipakai' }}</span>
        </button>
      </FieldRow>
      <FieldRow v-if="form.type === 'transfer'" label="Ke" for="tpl-to" :error="errors.toAccountId">
        <button
          id="tpl-to"
          type="button"
          :class="[FIELD_BUTTON, !form.toAccountId && 'text-muted-foreground']"
          @click="picker = 'to'"
        >
          <span class="truncate">{{ accountName(form.toAccountId) || 'Pilih akun tujuan' }}</span>
        </button>
      </FieldRow>
      <FieldRow label="Catatan" for="tpl-note">
        <input
          id="tpl-note"
          v-model="form.note"
          type="text"
          maxlength="120"
          :class="FIELD_INPUT"
          autocomplete="off"
        />
      </FieldRow>
    </FormGroup>

    <IosButton v-if="template" variant="red" block class="mt-2" @click="remove"
      >Hapus bookmark</IosButton
    >

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
