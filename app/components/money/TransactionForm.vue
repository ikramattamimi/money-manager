<script setup lang="ts">
import { Trash2, X, Zap } from '@lucide/vue';
import AmountInput from '@/components/base/AmountInput.vue';
import FormField from '@/components/base/FormField.vue';
import GridPicker from '@/components/data/GridPicker.vue';
import LinkSection from '@/components/money/LinkSection.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import { TONE_TEXT } from '@/components/data/tone';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { parseQuick } from '@/features/quick-add/parser';
import { useQuickLists } from '@/features/quick-add/useQuickLists';
import { useSuggest } from '@/features/quick-add/useSuggest';
import type { Draft, DraftLink } from '@/features/quick-add/types';
import type { Transaction, TxInput, TxType } from '@/features/transactions/api';
import { useTemplateMutations } from '@/features/templates/useTemplates';
import { useLastChoice } from '@/features/transactions/useLastChoice';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import { useTransactionMutations } from '@/features/transactions/useTransactions';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { fromLocalInput, toLocalInput } from '@/lib/time';
import { uuid } from '@/lib/uuid';

// Form lengkap tambah/edit transaksi: jenis, nominal, tanggal & jam (WIB),
// akun, kategori atau akun tujuan + biaya, catatan, keterangan.
// `layout="page"` untuk halaman penuh di HP: judul dari halaman, grid pilihan
// menempel di bawah layar seperti keyboard. `dialog` (iPad/desktop): grid
// tampil di dalam form.
const props = withDefaults(
  defineProps<{
    transaction: Transaction | null;
    draft: Draft | null;
    titleId: string;
    layout?: 'dialog' | 'page';
    /** Kepala dialog (judul + tutup) dipasang pembungkusnya (TransactionComposer) */
    bare?: boolean;
  }>(),
  { layout: 'dialog' },
);
const emit = defineEmits<{ close: [] }>();

const { bookId, canEdit } = useActiveBook();
const { active: accounts, byId: accountById } = useAccounts();
const categories = useCategories();
const mutations = useTransactionMutations();
const last = useLastChoice();
const toast = useToast();

const editing = computed(() => !!props.transaction);
const isAdjustment = computed(() => !!props.transaction?.is_adjustment);

const form = reactive({
  type: 'expense' as TxType,
  amount: 0,
  occurred: toLocalInput(new Date()),
  accountId: '',
  toAccountId: '',
  fee: 0,
  categoryId: '',
  note: '',
  description: '',
});
const errors = reactive<Record<string, string>>({});

// Kaitan reimburse/utang (fase 10 T6): pemasukan → pengeluaran yang digantinya
const links = ref<DraftLink[]>([]);
const linkPayload = (list: { expenseId: string; amount: number }[]) =>
  JSON.stringify(list.map((l) => ({ expenseId: l.expenseId, amount: l.amount })));
let initialLinks = '[]';

// Kolom tanggal hanya sampai menit. Kalau tidak diubah, pakai waktu asli
// (dengan detik) supaya urutan transaksi di menit yang sama tidak bergeser.
let original = { input: '', iso: '' };

function load() {
  const tx = props.transaction;
  if (tx) {
    Object.assign(form, {
      type: tx.type,
      amount: tx.amount,
      occurred: toLocalInput(tx.occurred_at),
      accountId: tx.account_id,
      toAccountId: tx.to_account_id ?? '',
      fee: tx.fee,
      categoryId: tx.category_id ?? '',
      note: tx.note,
      description: tx.description,
    });
    original = { input: form.occurred, iso: tx.occurred_at };
    links.value =
      tx.type === 'income'
        ? (tx.linked ?? []).map((l) => ({
            expenseId: l.id,
            note: l.note || 'Pengeluaran',
            occurredAt: l.occurredAt,
            amount: l.amount,
            max: null,
          }))
        : [];
    initialLinks = linkPayload(links.value);
  } else {
    const d = props.draft;
    const type = d?.type ?? 'expense';
    const remembered = last.get(type);
    const occurred = d?.occurredAt ? new Date(d.occurredAt) : new Date();
    Object.assign(form, {
      type,
      amount: d?.amount ?? 0,
      occurred: toLocalInput(occurred),
      accountId: d?.accountId ?? remembered.accountId ?? accounts.value[0]?.id ?? '',
      toAccountId: d?.toAccountId ?? remembered.toAccountId ?? '',
      fee: 0,
      categoryId: d?.categoryId ?? remembered.categoryId ?? '',
      note: d?.note ? d.note[0]!.toUpperCase() + d.note.slice(1) : '',
      description: '',
    });
    original = { input: form.occurred, iso: occurred.toISOString() };
    links.value = d?.links ? d.links.map((l) => ({ ...l })) : [];
    initialLinks = '[]';
  }
  for (const key of Object.keys(errors)) Reflect.deleteProperty(errors, key);
}
watch(() => [props.transaction, props.draft], load, { immediate: true });

// Ganti jenis: kategori lama mungkin tidak cocok lagi
watch(
  () => form.type,
  (type, previous) => {
    if (!previous || type === previous) return;
    const current = categories.byId.value.get(form.categoryId);
    if (current && current.kind !== type) form.categoryId = '';
    if (!form.categoryId && type !== 'transfer') form.categoryId = last.get(type).categoryId ?? '';
  },
);

const TYPES = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
] as const;

// Akun/kategori yang sudah diarsipkan tidak ada di pilihan. Saat mengedit
// transaksi lama yang memakainya, tetap tampilkan supaya tidak terhapus diam-diam.
const archivedAccounts = computed(() => {
  const tx = props.transaction;
  const ids = new Set([tx?.account_id, tx?.to_account_id]);
  return [...ids].flatMap((id) => {
    const a = id ? accountById.value.get(id) : undefined;
    return a?.archived ? [a] : [];
  });
});
const archivedCategory = computed(() => {
  const c = categories.byId.value.get(props.transaction?.category_id ?? '');
  return c?.archived && c.kind === form.type ? c : null;
});

// ---------- grid pilihan kategori & akun (gaya Realbyte) ----------
type Picker = 'category' | 'account' | 'to';
const picker = ref<Picker | null>(null);
const PICKER_TITLE: Record<Picker, string> = {
  category: 'Kategori',
  account: 'Akun',
  to: 'Akun tujuan',
};

function openPicker(which: Picker) {
  picker.value = picker.value === which ? null : which;
  // Tutup keyboard supaya grid tidak tertutup
  if (!picker.value) return;
  (document.activeElement as HTMLElement | null)?.blur();
  // Di halaman HP grid menutupi separuh bawah: geser kolomnya ke atas grid
  if (props.layout === 'page')
    nextTick(() =>
      document
        .getElementById(`tx-${which}`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
    );
}

const pickerItems = usePickerItems();
const categoryItems = computed(() =>
  form.type === 'transfer' ? [] : pickerItems.categoryItems(form.type, archivedCategory.value),
);
const accountItems = (exclude?: string) =>
  pickerItems.accountItems(exclude, archivedAccounts.value);

// ---------- ketik cepat (halaman HP, transaksi baru) ----------
// Ketikan seperti "kopi 25rb gopay" mengisi kolom di bawahnya; kolom tetap
// bisa diubah manual setelahnya.
const quickLists = useQuickLists();
const quickText = ref('');
const quickNote = ref('');
/** Yang terbaca langsung dari ketikan; saran riwayat tidak menimpanya */
const quickParsed = reactive({ type: false, account: false, category: false });
/** Dipilih manual lewat grid setelah mengetik; saran riwayat tidak menimpanya */
const quickTouched = reactive({ account: false, category: false });

function applyQuick(value: string) {
  quickText.value = value;
  const p = parseQuick(value, {
    accounts: quickLists.accounts.value,
    categories: quickLists.categories.value,
  });
  quickNote.value = p.note;
  Object.assign(quickParsed, { type: !!p.type, account: !!p.accountId, category: !!p.categoryId });
  if (p.type) form.type = p.type;
  form.amount = p.amount;
  form.note = p.note ? p.note[0]!.toUpperCase() + p.note.slice(1) : '';
  if (p.accountId) form.accountId = p.accountId;
  if (p.toAccountId) form.toAccountId = p.toAccountId;
  if (p.categoryId) form.categoryId = p.categoryId;
  if (p.occurredAt) {
    form.occurred = toLocalInput(p.occurredAt);
    original = { input: form.occurred, iso: p.occurredAt };
  }
}

// Saran dari riwayat buku (fase 6 T2) untuk catatan yang diketik
const suggestion = useSuggest(quickNote);

// Teks dari /add?text=... (Shortcut iOS) diisikan sekali ke kolom ketik
const prefill = useState('tx:prefill', () => '');
if (props.layout === 'page' && !props.transaction && prefill.value) {
  const text = prefill.value;
  prefill.value = '';
  applyQuick(text);
}
// Akun/kategori dimuat belakangan: baca ulang ketikan supaya alias dikenali
watch([quickLists.accounts, quickLists.categories], () => {
  if (quickText.value && !quickTouched.account && !quickTouched.category)
    applyQuick(quickText.value);
});
watch(suggestion, (s) => {
  if (!s || !quickText.value) return;
  if (s.type === 'income' && !quickParsed.type && form.type === 'expense') form.type = 'income';
  const category = s.category_id ? categories.byId.value.get(s.category_id) : undefined;
  if (category && category.kind === form.type && !quickParsed.category && !quickTouched.category)
    form.categoryId = category.id;
  if (s.account_id && !quickParsed.account && !quickTouched.account) form.accountId = s.account_id;
});
const suggestedAmount = computed(() =>
  quickText.value && !form.amount && suggestion.value?.amount ? suggestion.value.amount : 0,
);

// Mengetik di kolom lain menutup grid (keyboard yang ganti muncul)
function closePickerOnInput(event: FocusEvent) {
  if ((event.target as HTMLElement).matches('input')) picker.value = null;
}

// Urutan seperti Realbyte: kategori → akun → selesai
function choose(id: string) {
  const which = picker.value;
  if (which === 'category') {
    form.categoryId = id;
    quickTouched.category = true;
    picker.value = form.accountId ? null : 'account';
  } else if (which === 'account') {
    form.accountId = id;
    quickTouched.account = true;
    if (form.toAccountId === id) form.toAccountId = '';
    picker.value = form.type === 'transfer' && !form.toAccountId ? 'to' : null;
  } else if (which === 'to') {
    form.toAccountId = id;
    picker.value = null;
  }
}

const categoryStyle = computed(() => (form.categoryId ? categories.style(form.categoryId) : null));
const categoryText = computed(() =>
  form.categoryId ? categories.label(form.categoryId, true) : 'Tanpa kategori',
);
const accountName = (id: string) => accountById.value.get(id)?.name ?? '';

function validate() {
  for (const key of Object.keys(errors)) Reflect.deleteProperty(errors, key);
  if (form.amount <= 0) errors.amount = 'Isi nominal lebih dari 0.';
  if (!form.accountId) errors.accountId = 'Pilih akun.';
  if (form.type === 'transfer') {
    if (!form.toAccountId) errors.toAccountId = 'Pilih akun tujuan.';
    else if (form.toAccountId === form.accountId)
      errors.toAccountId = 'Akun tujuan harus berbeda dari akun asal.';
  }
  if (!form.occurred) errors.occurred = 'Isi tanggal dan jam.';
  if (form.type === 'income' && links.value.length) {
    const total = links.value.reduce((s, l) => s + l.amount, 0);
    if (links.value.some((l) => l.amount <= 0)) errors.links = 'Isi nominal tiap kaitan.';
    else if (links.value.some((l) => l.max !== null && l.amount > l.max))
      errors.links = 'Nominal kaitan melebihi sisa pengeluarannya.';
    else if (total > form.amount) errors.links = 'Total kaitan melebihi nominal pemasukan.';
  }
  return Object.keys(errors).length === 0;
}

function payload(): Omit<TxInput, 'id' | 'book_id'> {
  const transfer = form.type === 'transfer';
  return {
    type: form.type,
    amount: form.amount,
    occurred_at: form.occurred === original.input ? original.iso : fromLocalInput(form.occurred),
    account_id: form.accountId,
    to_account_id: transfer ? form.toAccountId : null,
    fee: transfer ? form.fee : 0,
    category_id: transfer ? null : form.categoryId || null,
    note: form.note.trim(),
    description: form.description.trim(),
  };
}

function save(again = false) {
  if (!validate() || !bookId.value) return;
  const data = payload();
  last.remember(form.type, {
    accountId: form.accountId,
    toAccountId: form.toAccountId || null,
    categoryId: form.categoryId || null,
  });

  const nextLinks = form.type === 'income' ? links.value : [];
  const linksChanged = linkPayload(nextLinks) !== initialLinks;

  if (props.transaction) {
    const before = props.transaction;
    const update = () => mutations.update.mutateAsync({ before, patch: data });
    const relink = () =>
      linksChanged ? mutations.saveLinks(before.id, nextLinks) : Promise.resolve();
    // Nominal turun atau jenis berubah: kaitan disesuaikan dulu supaya database tidak menolak
    const linksFirst = data.amount < before.amount || data.type !== before.type;
    (linksFirst ? relink().then(update) : update().then(relink)).catch(() => {
      // Pesan galat sudah ditampilkan lewat toast
    });
    toast.show('Perubahan disimpan');
    emit('close');
    return;
  }

  const input: TxInput = {
    ...data,
    id: uuid(),
    book_id: bookId.value,
    source: 'manual',
  };
  if (nextLinks.length)
    mutations.create
      .mutateAsync(input)
      .then(() => mutations.saveLinks(input.id!, nextLinks))
      .catch(() => {
        // Pesan galat sudah ditampilkan lewat toast
      });
  else mutations.create.mutate(input);
  toast.show(`Tersimpan · ${formatRupiah(input.amount)}`, () =>
    mutations.remove.mutate({ ...input, fee: input.fee ?? 0 } as Transaction),
  );
  if (again) {
    quickText.value = '';
    quickNote.value = '';
    Object.assign(quickTouched, { account: false, category: false });
    form.amount = 0;
    form.note = '';
    form.description = '';
    links.value = [];
    // Mode beruntun: kembali ke kolom ketik (halaman HP) atau nominal
    nextTick(() =>
      (document.getElementById('tx-quick') ?? document.getElementById('tx-amount'))?.focus(),
    );
  } else {
    emit('close');
  }
}

// Pengeluaran ini diganti: buka form pemasukan baru yang sudah terkait
const editor = useTxEditor();
function recordReimbursement(remaining: number) {
  const tx = props.transaction;
  if (!tx) return;
  const note = tx.note || categories.label(tx.category_id) || 'pengeluaran';
  editor.create({
    type: 'income',
    amount: remaining,
    accountId: tx.account_id,
    toAccountId: null,
    categoryId: null,
    note: `Ganti ${note}`,
    occurredAt: null,
    links: [
      { expenseId: tx.id, note, occurredAt: tx.occurred_at, amount: remaining, max: remaining },
    ],
  });
}

function remove() {
  if (!props.transaction) return;
  mutations.removeWithUndo(props.transaction, props.transaction.note || 'Transaksi');
  emit('close');
}

// Simpan isian saat ini sebagai template (fase 6 T4): satu tap di Catat cepat
const templateMutations = useTemplateMutations();
function saveAsTemplate() {
  if (!bookId.value) return;
  const data = payload();
  const name = (data.note || categories.label(data.category_id) || 'Transaksi').slice(0, 60);
  templateMutations.create.mutate(
    {
      book_id: bookId.value,
      name,
      type: data.type,
      amount: data.amount > 0 ? data.amount : null,
      account_id: data.account_id || null,
      to_account_id: data.to_account_id,
      category_id: data.category_id,
      note: data.note,
      description: data.description,
    },
    { onSuccess: () => toast.show(`Template ${name} dibuat`) },
  );
}
</script>

<template>
  <form
    :class="['flex flex-col gap-3.5', layout === 'page' && picker && 'pb-[58dvh]']"
    novalidate
    @submit.prevent="save()"
    @focusin="closePickerOnInput"
  >
    <div v-if="layout === 'dialog' && !bare" class="flex items-center gap-2">
      <h2 :id="titleId" class="m-0 flex-1 text-panel font-bold">
        {{ isAdjustment ? 'Koreksi saldo' : editing ? 'Ubah transaksi' : 'Transaksi baru' }}
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

    <p
      v-if="isAdjustment"
      class="m-0 rounded-xl bg-surface-2 px-3 py-2.5 text-meta text-muted-foreground"
    >
      Transaksi ini dibuat oleh "Sesuaikan saldo" dan tidak dihitung di statistik. Untuk mengubah
      saldo lagi, pakai Sesuaikan saldo di halaman akun.
    </p>

    <template v-else>
      <FormField
        v-if="layout === 'page' && !editing"
        label="Ketik saja"
        for="tx-quick"
        hint="mis. bensin 100rb kemarin bca · bca ke gopay 99rb · + gaji 5jt bca"
      >
        <input
          id="tx-quick"
          :value="quickText"
          type="text"
          class="field-input"
          placeholder="kopi 25rb gopay"
          autocomplete="off"
          autocapitalize="off"
          enterkeyhint="done"
          @input="applyQuick(($event.target as HTMLInputElement).value)"
        />
      </FormField>
      <button
        v-if="suggestedAmount"
        type="button"
        class="press -mt-2 self-start rounded-lg bg-primary-soft px-2.5 py-1 text-meta font-semibold text-primary-ink"
        @click="form.amount = suggestedAmount"
      >
        Biasanya {{ formatRupiah(suggestedAmount) }} · pakai
      </button>

      <SegmentedControl v-model="form.type" :options="TYPES" label="Jenis transaksi" />

      <div class="grid gap-3 sm:grid-cols-2">
        <FormField label="Nominal" for="tx-amount" :error="errors.amount">
          <AmountInput id="tx-amount" v-model="form.amount" :invalid="!!errors.amount" />
        </FormField>
        <FormField label="Tanggal & jam" for="tx-occurred" :error="errors.occurred">
          <input
            id="tx-occurred"
            v-model="form.occurred"
            type="datetime-local"
            class="field-input"
          />
        </FormField>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <FormField v-if="form.type !== 'transfer'" label="Kategori" for="tx-category">
          <button
            id="tx-category"
            type="button"
            :class="['field-input picker-field scroll-mt-24', picker === 'category' && 'is-open']"
            :aria-expanded="picker === 'category'"
            @click="openPicker('category')"
          >
            <component
              :is="categoryStyle.icon"
              v-if="categoryStyle"
              :class="['size-4 shrink-0', TONE_TEXT[categoryStyle.tone]]"
              aria-hidden="true"
            />
            <span :class="['truncate', !form.categoryId && 'text-faint']">{{ categoryText }}</span>
          </button>
        </FormField>

        <FormField
          :label="form.type === 'transfer' ? 'Dari akun' : 'Akun'"
          for="tx-account"
          :error="errors.accountId"
        >
          <button
            id="tx-account"
            type="button"
            :class="['field-input picker-field scroll-mt-24', picker === 'account' && 'is-open']"
            :aria-expanded="picker === 'account'"
            :aria-invalid="!!errors.accountId || undefined"
            @click="openPicker('account')"
          >
            <span :class="['truncate', !form.accountId && 'text-faint']">
              {{ accountName(form.accountId) || 'Pilih akun' }}
            </span>
          </button>
        </FormField>

        <FormField
          v-if="form.type === 'transfer'"
          label="Ke akun"
          for="tx-to"
          :error="errors.toAccountId"
        >
          <button
            id="tx-to"
            type="button"
            :class="['field-input picker-field scroll-mt-24', picker === 'to' && 'is-open']"
            :aria-expanded="picker === 'to'"
            :aria-invalid="!!errors.toAccountId || undefined"
            @click="openPicker('to')"
          >
            <span :class="['truncate', !form.toAccountId && 'text-faint']">
              {{ accountName(form.toAccountId) || 'Pilih akun tujuan' }}
            </span>
          </button>
        </FormField>
      </div>

      <!-- Grid pilihan: di dialog tampil di sini, di halaman HP menempel di bawah -->
      <Transition :name="layout === 'page' ? 'dock' : ''">
        <section
          v-if="picker"
          :class="
            layout === 'page'
              ? 'fixed inset-x-0 bottom-0 z-40 flex max-h-[56dvh] flex-col border-t bg-card shadow-float'
              : 'overflow-hidden rounded-xl border'
          "
          :aria-label="PICKER_TITLE[picker]"
        >
          <div class="flex items-center gap-2 border-b bg-surface-2 py-1 pl-3.5 pr-1">
            <b class="flex-1 text-label">{{ PICKER_TITLE[picker] }}</b>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              class="press-icon"
              :aria-label="`Tutup pilihan ${PICKER_TITLE[picker].toLowerCase()}`"
              @click="picker = null"
            >
              <X />
            </Button>
          </div>
          <div
            :class="[
              'overflow-y-auto overscroll-contain',
              layout === 'page' && 'pb-[env(safe-area-inset-bottom,0px)]',
            ]"
          >
            <GridPicker
              v-if="picker === 'category'"
              :key="`cat-${form.type}`"
              :items="categoryItems"
              :model-value="form.categoryId"
              label="Pilih kategori"
              @select="choose"
            />
            <GridPicker
              v-else
              :key="picker"
              :items="accountItems(picker === 'to' ? form.accountId : undefined)"
              :model-value="picker === 'to' ? form.toAccountId : form.accountId"
              :label="picker === 'to' ? 'Pilih akun tujuan' : 'Pilih akun'"
              @select="choose"
            />
          </div>
        </section>
      </Transition>

      <FormField
        v-if="form.type === 'transfer'"
        label="Biaya admin"
        for="tx-fee"
        hint="Mengurangi akun asal, tidak masuk ke akun tujuan."
      >
        <AmountInput id="tx-fee" v-model="form.fee" />
      </FormField>

      <FormField label="Catatan" for="tx-note" hint="Toko atau tempat, mis. Indomaret.">
        <input
          id="tx-note"
          v-model="form.note"
          type="text"
          maxlength="120"
          class="field-input"
          autocomplete="off"
        />
      </FormField>
      <FormField label="Keterangan" for="tx-desc">
        <input
          id="tx-desc"
          v-model="form.description"
          type="text"
          maxlength="240"
          class="field-input"
          autocomplete="off"
        />
      </FormField>

      <LinkSection
        v-if="form.type === 'income'"
        v-model:links="links"
        kind="income"
        :transaction="transaction"
        :amount="form.amount"
        :error="errors.links"
        @fill-amount="(total) => (form.amount = total)"
      />
      <LinkSection
        v-else-if="form.type === 'expense' && transaction?.type === 'expense'"
        v-model:links="links"
        kind="expense"
        :transaction="transaction"
        :amount="form.amount"
        @reimburse="recordReimbursement"
      />
    </template>

    <div
      v-if="canEdit"
      :class="['flex flex-wrap items-center gap-2 pt-1', layout === 'page' && 'form-page-actions']"
    >
      <Button v-if="editing" type="button" variant="ghost-danger" size="touch" @click="remove">
        <Trash2 />Hapus
      </Button>
      <Button
        v-if="editing && !isAdjustment"
        type="button"
        variant="ghost"
        size="touch"
        @click="saveAsTemplate"
      >
        <Zap />Jadikan template
      </Button>
      <span class="flex-1" />
      <template v-if="!isAdjustment">
        <Button v-if="!editing" type="button" variant="secondary" size="touch" @click="save(true)"
          >Simpan &amp; lagi</Button
        >
        <Button type="submit" size="touch">{{ editing ? 'Simpan perubahan' : 'Simpan' }}</Button>
      </template>
    </div>
  </form>
</template>

<style scoped>
.picker-field {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}
.picker-field.is-open {
  border-color: var(--primary-accent);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

/* Grid menempel di bawah seperti keyboard: masuk 280ms, keluar 200ms */
.dock-enter-active {
  transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
}
.dock-leave-active {
  transition: transform 200ms ease-in;
}
.dock-enter-from,
.dock-leave-to {
  transform: translateY(100%);
}
@media (prefers-reduced-motion: reduce) {
  .dock-enter-active,
  .dock-leave-active {
    transition: none;
  }
}
</style>
