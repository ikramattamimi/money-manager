<script setup lang="ts">
import { Trash2, X } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import FormField from '@/components/base/FormField.vue';
import GridPicker from '@/components/data/GridPicker.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import { TONE_TEXT } from '@/components/data/tone';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import type { Template } from '@/features/templates/api';
import { useTemplateMutations } from '@/features/templates/useTemplates';
import type { TxType } from '@/features/transactions/api';
import { usePickerItems } from '@/features/transactions/usePickerItems';

// Tambah/ubah template (bookmark Realbyte). Nominal boleh kosong: saat dipakai,
// panel catat dibuka dengan keypad. Template bernominal tersimpan dengan 1 tap.
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
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
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

function save() {
  for (const key of Object.keys(errors)) Reflect.deleteProperty(errors, key);
  if (!form.name.trim()) errors.name = 'Isi nama template.';
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
      { onSuccess: () => toast.show('Template disimpan') },
    );
  } else {
    mutations.create.mutate(
      { ...data, book_id: bookId.value },
      { onSuccess: () => toast.show(`Template ${data.name} ditambahkan`) },
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
  <form class="flex flex-col gap-3.5" novalidate @submit.prevent="save">
    <div v-if="!page" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ template ? 'Ubah template' : 'Template baru' }}
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

    <FormField
      label="Nama"
      for="tpl-name"
      :error="errors.name"
      hint="Muncul sebagai tombol di Catat cepat."
    >
      <input
        id="tpl-name"
        v-model="form.name"
        type="text"
        maxlength="60"
        class="field-input"
        autocomplete="off"
        placeholder="mis. Spotify Agoy"
        :aria-invalid="!!errors.name || undefined"
        @input="nameTouched = true"
      />
    </FormField>

    <FormField
      label="Nominal"
      for="tpl-amount"
      hint="Kosongkan kalau nominalnya berubah-ubah: keypad dibuka saat dipakai."
    >
      <AmountInput id="tpl-amount" v-model="form.amount" placeholder="Tanya saat dipakai" />
    </FormField>

    <div class="grid gap-3 sm:grid-cols-2">
      <FormField v-if="form.type !== 'transfer'" label="Kategori" for="tpl-category">
        <button
          id="tpl-category"
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
        for="tpl-account"
        :error="errors.accountId"
      >
        <button
          id="tpl-account"
          type="button"
          class="field-input flex items-center text-left"
          @click="picker = picker === 'account' ? null : 'account'"
        >
          <span :class="['truncate', !form.accountId && 'text-faint']">
            {{ accountName(form.accountId) || 'Akun terakhir dipakai' }}
          </span>
        </button>
      </FormField>
      <FormField
        v-if="form.type === 'transfer'"
        label="Ke akun"
        for="tpl-to"
        :error="errors.toAccountId"
      >
        <button
          id="tpl-to"
          type="button"
          class="field-input flex items-center text-left"
          @click="picker = picker === 'to' ? null : 'to'"
        >
          <span :class="['truncate', !form.toAccountId && 'text-faint']">
            {{ accountName(form.toAccountId) || 'Pilih akun tujuan' }}
          </span>
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

    <FormField label="Catatan" for="tpl-note">
      <input
        id="tpl-note"
        v-model="form.note"
        type="text"
        maxlength="120"
        class="field-input"
        autocomplete="off"
      />
    </FormField>

    <div :class="['flex flex-wrap items-center gap-2 pt-1', page && 'form-page-actions']">
      <Button v-if="template" type="button" variant="ghost-danger" size="touch" @click="remove">
        <Trash2 />Hapus
      </Button>
      <span class="flex-1" />
      <Button type="submit" size="touch">{{
        template ? 'Simpan perubahan' : 'Tambah template'
      }}</Button>
    </div>
  </form>
</template>
