<script setup lang="ts">
import {
  ArrowDownUp,
  ArrowLeftRight,
  Camera,
  FileText,
  Minus,
  Plus,
  Repeat,
  Star,
} from '@lucide/vue';
import { TONE_CLASS } from '@/components/data/tone';
import Dock from '@/components/ios/Dock.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import IosSwitch from '@/components/ios/IosSwitch.vue';
import Segmented from '@/components/ios/Segmented.vue';
import ChoiceGrid from '@/components/money/ChoiceGrid.vue';
import DatePanel from '@/components/money/DatePanel.vue';
import Keypad from '@/components/money/Keypad.vue';
import LinkSection from '@/components/money/LinkSection.vue';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { parseQuick } from '@/features/quick-add/parser';
import type { Draft, DraftLink } from '@/features/quick-add/types';
import { useQuickLists } from '@/features/quick-add/useQuickLists';
import { useSuggest } from '@/features/quick-add/useSuggest';
import { installmentPlan } from '@/features/recurring/installment';
import {
  INSTALLMENT_MONTHS,
  REPEAT_OPTIONS,
  repeatRule,
  type RepeatOption,
} from '@/features/recurring/repeat';
import { useRecurringMutations } from '@/features/recurring/useRecurring';
import { useTemplateMutations } from '@/features/templates/useTemplates';
import type { Transaction, TxInput, TxType } from '@/features/transactions/api';
import {
  evaluate,
  expressionLabel,
  fromAmount,
  hasOperator,
  keyFromKeyboard,
  press as pressKey,
  type CalcKey,
} from '@/features/transactions/calculator';
import { dayParts } from '@/features/transactions/grouping';
import { useLastChoice } from '@/features/transactions/useLastChoice';
import { usePickerItems } from '@/features/transactions/usePickerItems';
import { useTransactionMutations } from '@/features/transactions/useTransactions';
import { useTxEditor } from '@/features/transactions/useTxEditor';
import { formatRupiah } from '@/lib/format';
import { fromLocalInput, MONTHS_SHORT, toLocalInput } from '@/lib/time';
import { uuid } from '@/lib/uuid';

// Form catat/ubah transaksi gaya Realbyte (mockup form-*): baris label kiri,
// nilai kanan; panel bawah seperti keyboard berisi papan angka berkalkulator,
// grid kategori/akun, atau kalender. Alur otomatis Nominal → Kategori → Akun →
// Catatan. `layout="page"` (HP): bar atas Batal · jenis · bintang, panel
// menempel di bawah layar. `dialog` (iPad/desktop): panel di dalam form,
// papan angka juga bisa diketik dari keyboard.
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
const editor = useTxEditor();

const editing = computed(() => !!props.transaction);
const isAdjustment = computed(() => !!props.transaction?.is_adjustment);

const form = reactive({
  type: 'expense' as TxType,
  date: '',
  time: '',
  accountId: '',
  toAccountId: '',
  categoryId: '',
  note: '',
  description: '',
});
/** Nominal dan biaya transfer sebagai token kalkulator */
const tokens = ref<string[]>([]);
const feeTokens = ref<string[]>([]);
const feeOn = ref(false);
const amount = computed(() => evaluate(tokens.value));
const fee = computed(() => (feeOn.value ? evaluate(feeTokens.value) : 0));

// Kaitan reimburse/utang (fase 10 T6): pemasukan → pengeluaran yang digantinya
const links = ref<DraftLink[]>([]);
const linkError = ref('');
const linkPayload = (list: { expenseId: string; amount: number }[]) =>
  JSON.stringify(list.map((l) => ({ expenseId: l.expenseId, amount: l.amount })));
let initialLinks = '[]';

// Waktu asli (dengan detik) dipakai kalau tanggal/jam tidak diubah, supaya
// urutan transaksi di menit yang sama tidak bergeser
let original = { input: '', iso: '' };
const localInput = () => `${form.date}T${form.time}`;
function setOccurred(value: string | Date) {
  const local = toLocalInput(value);
  form.date = local.slice(0, 10);
  form.time = local.slice(11, 16);
}

type Panel = 'keypad' | 'fee' | 'category' | 'account' | 'to' | 'date';
const panel = ref<Panel | null>(null);
const repeat = ref<RepeatOption>('none');
const installment = ref<number | null>(null);

function load() {
  const tx = props.transaction;
  if (tx) {
    Object.assign(form, {
      type: tx.type,
      accountId: tx.account_id,
      toAccountId: tx.to_account_id ?? '',
      categoryId: tx.category_id ?? '',
      note: tx.note,
      description: tx.description,
    });
    setOccurred(tx.occurred_at);
    tokens.value = fromAmount(tx.amount);
    feeTokens.value = fromAmount(tx.fee);
    feeOn.value = tx.fee > 0;
    original = { input: localInput(), iso: tx.occurred_at };
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
    panel.value = null;
  } else {
    const d = props.draft;
    const type = d?.type ?? 'expense';
    const remembered = last.get(type);
    const occurred = d?.occurredAt ? new Date(d.occurredAt) : new Date();
    Object.assign(form, {
      type,
      accountId: d?.accountId ?? remembered.accountId ?? accounts.value[0]?.id ?? '',
      toAccountId: d?.toAccountId ?? remembered.toAccountId ?? '',
      categoryId: d?.categoryId ?? (d ? '' : (remembered.categoryId ?? '')),
      note: d?.note ? d.note[0]!.toUpperCase() + d.note.slice(1) : '',
      description: '',
    });
    setOccurred(occurred);
    tokens.value = fromAmount(d?.amount ?? 0);
    feeTokens.value = [];
    feeOn.value = false;
    original = { input: localInput(), iso: occurred.toISOString() };
    links.value = d?.links ? d.links.map((l) => ({ ...l })) : [];
    initialLinks = '[]';
    // Mulai dari langkah pertama yang belum terisi
    panel.value = !amount.value ? 'keypad' : null;
  }
  repeat.value = 'none';
  installment.value = null;
  linkError.value = '';
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
    if (type !== 'expense') installment.value = null;
    if (panel.value === 'category' && type === 'transfer') panel.value = 'account';
  },
);

// ---------- jenis transaksi: pil dengan sorotan meluncur ----------
const TYPES = [
  { value: 'income', label: 'Pemasukan', icon: Plus, tone: 'text-inc' },
  { value: 'expense', label: 'Pengeluaran', icon: Minus, tone: 'text-exp' },
  { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight, tone: 'text-foreground' },
] as const;
const pill = ref<HTMLElement>();
const pillReady = ref(false);
const hlStyle = ref<Record<string, string>>({});
function placePill() {
  const btn = pill.value?.querySelector<HTMLElement>('[aria-checked="true"]');
  if (!btn) return;
  hlStyle.value = { width: `${btn.offsetWidth}px`, transform: `translateX(${btn.offsetLeft}px)` };
}
watch(
  () => form.type,
  () => nextTick(placePill),
);
onMounted(() =>
  nextTick(() => {
    placePill();
    // Posisi awal tanpa animasi, baru kemudian meluncur
    requestAnimationFrame(() => (pillReady.value = true));
  }),
);

// ---------- pilihan kategori & akun ----------
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
const pickerItems = usePickerItems();
const categoryItems = computed(() =>
  form.type === 'transfer' ? [] : pickerItems.categoryItems(form.type, archivedCategory.value),
);
const accountItems = (exclude?: string) =>
  pickerItems.accountItems(exclude, archivedAccounts.value);

const noteInput = ref<HTMLInputElement>();
const touched = reactive({ account: false, category: false });

/** Urutan langkah seperti Realbyte */
const steps = computed<Panel[]>(() =>
  form.type === 'transfer' ? ['keypad', 'account', 'to'] : ['keypad', 'category', 'account'],
);
const stepIndex = computed(() => (panel.value ? steps.value.indexOf(panel.value) : -1));

/** Lanjut ke langkah berikutnya yang dibutuhkan; habis = fokus ke Catatan */
function advance(from: Panel) {
  const order = steps.value;
  const next = order[order.indexOf(from) + 1];
  if (next) {
    panel.value = next;
    return;
  }
  panel.value = null;
  // Fokus langsung di dalam ketukan supaya keyboard iOS ikut muncul
  if (!editing.value) noteInput.value?.focus();
}

function choose(id: string) {
  if (panel.value === 'category') {
    form.categoryId = id;
    touched.category = true;
    advance('category');
  } else if (panel.value === 'account') {
    form.accountId = id;
    touched.account = true;
    if (form.toAccountId === id) form.toAccountId = '';
    advance('account');
  } else if (panel.value === 'to') {
    form.toAccountId = id;
    advance('to');
  }
}

function openPanel(which: Panel) {
  (document.activeElement as HTMLElement | null)?.blur();
  panel.value = panel.value === which ? null : which;
}

// ---------- papan angka ----------
function onKey(key: CalcKey) {
  const target = panel.value === 'fee' ? feeTokens : tokens;
  if (key === '=' && !hasOperator(target.value)) {
    if (panel.value === 'fee') panel.value = null;
    else if (amount.value > 0) advance('keypad');
    return;
  }
  target.value = pressKey(target.value, key);
}
// Keyboard fisik (iPad/desktop) saat papan angka terbuka
function onKeydown(event: KeyboardEvent) {
  if (panel.value !== 'keypad' && panel.value !== 'fee') return;
  if ((event.target as HTMLElement).closest('input, textarea, select')) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key === 'Enter' ? '=' : keyFromKeyboard(event.key);
  if (!key) return;
  event.preventDefault();
  onKey(key);
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

const expr = computed(() =>
  expressionLabel(panel.value === 'fee' ? feeTokens.value : tokens.value),
);

// ---------- ketik cepat dari Shortcut iOS (/add?text=…) ----------
const quickLists = useQuickLists();
const quickText = ref('');
const prefill = useState('tx:prefill', () => '');
function applyQuick(value: string) {
  quickText.value = value;
  const p = parseQuick(value, {
    accounts: quickLists.accounts.value,
    categories: quickLists.categories.value,
  });
  if (p.type) form.type = p.type;
  tokens.value = fromAmount(p.amount);
  form.note = p.note ? p.note[0]!.toUpperCase() + p.note.slice(1) : '';
  if (p.accountId) form.accountId = p.accountId;
  if (p.toAccountId) form.toAccountId = p.toAccountId;
  if (p.categoryId) {
    form.categoryId = p.categoryId;
    touched.category = true;
  }
  if (p.occurredAt) {
    setOccurred(p.occurredAt);
    original = { input: localInput(), iso: p.occurredAt };
  }
  panel.value = p.amount ? null : 'keypad';
}
if (!props.transaction && prefill.value) {
  const text = prefill.value;
  prefill.value = '';
  applyQuick(text);
}
watch([quickLists.accounts, quickLists.categories], () => {
  if (quickText.value && !touched.account && !touched.category) applyQuick(quickText.value);
});

// Saran dari riwayat buku: catatan yang diketik mengisi kategori/akun yang
// belum dipilih sendiri (pengaturan "Isi otomatis catatan" di mockup)
const suggestNote = computed(() => (editing.value ? '' : form.note));
const suggestion = useSuggest(suggestNote);
watch(suggestion, (s) => {
  if (!s || editing.value) return;
  const category = s.category_id ? categories.byId.value.get(s.category_id) : undefined;
  if (category && category.kind === form.type && !touched.category) form.categoryId = category.id;
  if (s.account_id && !touched.account) form.accountId = s.account_id;
});
const suggestedAmount = computed(() =>
  !editing.value && !amount.value && suggestion.value?.amount ? suggestion.value.amount : 0,
);

// ---------- tampilan baris ----------
const dateLabel = computed(() => {
  if (!form.date) return '';
  const p = dayParts(form.date);
  return `${p.weekday}, ${p.num} ${MONTHS_SHORT[Number(form.date.slice(5, 7)) - 1]} ${form.date.slice(0, 4)}`;
});
const categoryStyle = computed(() => (form.categoryId ? categories.style(form.categoryId) : null));
const categoryText = computed(() =>
  form.categoryId ? categories.label(form.categoryId, true) : '',
);
const accountName = (id: string) => accountById.value.get(id)?.name ?? '';
const AMOUNT_TONE = { expense: 'text-exp', income: 'text-inc', transfer: 'text-foreground' };

const canSave = computed(
  () =>
    canEdit.value &&
    amount.value > 0 &&
    !!form.accountId &&
    (form.type !== 'transfer' || (!!form.toAccountId && form.toAccountId !== form.accountId)) &&
    !!form.date,
);

// ---------- ulangi & cicilan ----------
const repeatOpen = ref(false);
const installmentOpen = ref(false);
const repeatShort = computed(() =>
  installment.value
    ? `${installment.value}×`
    : (REPEAT_OPTIONS.find((o) => o.value === repeat.value)?.short ?? ''),
);
const repeatLabel = computed(() =>
  installment.value
    ? `Cicilan ${installment.value} bulan`
    : (REPEAT_OPTIONS.find((o) => o.value === repeat.value)?.label ?? 'Tidak'),
);
function pickRepeat(option: RepeatOption) {
  repeat.value = option;
  installment.value = null;
  repeatOpen.value = false;
}
function openInstallment() {
  repeatOpen.value = false;
  installmentOpen.value = true;
}
const installmentRows = computed(() =>
  INSTALLMENT_MONTHS.map((months) => {
    const plan = installmentPlan(amount.value, months, form.date, Number(form.date.slice(8)));
    return { months, plan };
  }),
);
function pickInstallment(months: number | null) {
  installment.value = months;
  if (months) repeat.value = 'none';
  installmentOpen.value = false;
}

// ---------- simpan ----------
function payload(): Omit<TxInput, 'id' | 'book_id'> {
  const transfer = form.type === 'transfer';
  const input = localInput();
  return {
    type: form.type,
    amount: amount.value,
    occurred_at: input === original.input ? original.iso : fromLocalInput(input),
    account_id: form.accountId,
    to_account_id: transfer ? form.toAccountId : null,
    fee: transfer ? fee.value : 0,
    category_id: transfer ? null : form.categoryId || null,
    note: form.note.trim(),
    description: form.description.trim(),
  };
}

function validateLinks() {
  linkError.value = '';
  if (form.type !== 'income' || !links.value.length) return true;
  const total = links.value.reduce((s, l) => s + l.amount, 0);
  if (links.value.some((l) => l.amount <= 0)) linkError.value = 'Isi nominal tiap kaitan.';
  else if (links.value.some((l) => l.max !== null && l.amount > l.max))
    linkError.value = 'Nominal kaitan melebihi sisa pengeluarannya.';
  else if (total > amount.value) linkError.value = 'Total kaitan melebihi nominal pemasukan.';
  return !linkError.value;
}

const recurring = useRecurringMutations();
/** Aturan berulang/cicilan untuk transaksi baru; transaksi sekarang = kejadian pertama */
function saveRepeat(data: Omit<TxInput, 'id' | 'book_id'>): { amount: number; label: string } {
  const name = (data.note || categories.label(data.category_id) || 'Transaksi').slice(0, 60);
  const base = {
    book_id: bookId.value!,
    type: data.type,
    account_id: data.account_id,
    to_account_id: data.to_account_id,
    fee: data.fee ?? 0,
    category_id: data.category_id,
    note: data.note,
    description: data.description ?? '',
    auto_post: true,
    active: true,
  };
  if (installment.value) {
    const day = Number(form.date.slice(8));
    const plan = installmentPlan(data.amount, installment.value, form.date, day);
    if (!plan) return { amount: data.amount, label: '' };
    const first = repeatRule('monthly', form.date)!;
    recurring.create.mutate({
      ...base,
      name: `${name} (cicilan)`,
      amount: plan.amount,
      frequency: 'monthly',
      interval: 1,
      day_of_month: day,
      start_on: first.start_on,
      next_run_on: first.start_on,
      end_on: plan.endOn,
    });
    return { amount: plan.amount, label: ` · cicilan ${installment.value}×` };
  }
  const rule = repeatRule(repeat.value, form.date);
  if (!rule) return { amount: data.amount, label: '' };
  recurring.create.mutate({
    ...base,
    name,
    amount: data.amount,
    ...rule,
    next_run_on: rule.start_on,
  });
  return { amount: data.amount, label: ` · ${repeatLabel.value.toLowerCase()}` };
}

function save(again = false) {
  if (!canSave.value || !bookId.value || !validateLinks()) return;
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

  // Cicilan: transaksi pertama sebesar cicilan per bulan
  const repeated = saveRepeat(data);
  const input: TxInput = {
    ...data,
    amount: repeated.amount,
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
  const p = dayParts(form.date);
  toast.show(
    `Tersimpan di ${p.num} ${MONTHS_SHORT[Number(form.date.slice(5, 7)) - 1]}${repeated.label}`,
    () => mutations.remove.mutate({ ...input, fee: input.fee ?? 0 } as Transaction),
  );
  if (again) {
    // Catat lagi: tanggal, jam, jenis, dan akun tetap; mulai dari nominal
    tokens.value = [];
    feeTokens.value = [];
    feeOn.value = false;
    form.note = '';
    form.description = '';
    links.value = [];
    repeat.value = 'none';
    installment.value = null;
    touched.category = false;
    quickText.value = '';
    panel.value = 'keypad';
  } else {
    emit('close');
  }
}

// ---------- aksi lain ----------
/** Pengeluaran ini diganti: buka form pemasukan baru yang sudah terkait */
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

/** Salin (mockup form-copy): transaksi baru dengan isian sama, tanggal hari ini atau asli */
const copyOpen = ref(false);
function copy(sameDate: boolean) {
  copyOpen.value = false;
  const data = payload();
  editor.create({
    type: data.type,
    amount: data.amount,
    accountId: data.account_id,
    toAccountId: data.to_account_id ?? null,
    categoryId: data.category_id ?? null,
    note: data.note ?? '',
    occurredAt: sameDate ? (data.occurred_at ?? null) : null,
  });
}

/** Bintang di bar atas: simpan isian sekarang sebagai bookmark (tabel templates) */
const templateMutations = useTemplateMutations();
const starred = ref(false);
function saveAsBookmark() {
  if (!bookId.value || starred.value) return;
  const data = payload();
  const name = (data.note || categories.label(data.category_id) || 'Transaksi').slice(0, 60);
  starred.value = true;
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
    {
      onSuccess: () => toast.show(`Bookmark ${name} dibuat`),
      onError: () => (starred.value = false),
    },
  );
}

/** Pintasan impor (mockup .impshort): pindah ke halaman impor */
function importFrom(source: 'photo' | 'bank') {
  emit('close');
  navigateTo(`/settings/import/${source}`);
}

function swapAccounts() {
  if (!form.toAccountId) return;
  [form.accountId, form.toAccountId] = [form.toAccountId, form.accountId];
}

const PANEL_TITLE: Record<Panel, string> = {
  keypad: 'Nominal',
  fee: 'Biaya transfer',
  category: 'Kategori',
  account: 'Akun',
  to: 'Ke akun',
  date: 'Tanggal & jam',
};
const panelTitle = computed(() =>
  panel.value === 'account' && form.type === 'transfer'
    ? 'Dari akun'
    : panel.value
      ? PANEL_TITLE[panel.value]
      : '',
);
</script>

<template>
  <form
    class="tx-form flex flex-col"
    novalidate
    :aria-labelledby="titleId"
    @submit.prevent="save()"
  >
    <!-- Bar atas halaman HP: Batal · jenis · bintang -->
    <header
      v-if="layout === 'page'"
      class="sticky top-0 z-30 bg-card pt-[env(safe-area-inset-top,0px)] shadow-[0_0.5px_0_var(--sep)]"
    >
      <h1 :id="titleId" class="sr-only">
        {{ isAdjustment ? 'Koreksi saldo' : editing ? 'Ubah transaksi' : 'Transaksi baru' }}
      </h1>
      <div class="flex h-11 items-center gap-1 px-1">
        <button
          type="button"
          class="h-11 px-3 text-bar text-primary-accent active:opacity-50"
          @click="emit('close')"
        >
          Batal
        </button>
        <div class="flex min-w-0 flex-1 justify-center">
          <div
            v-if="!isAdjustment"
            ref="pill"
            role="radiogroup"
            aria-label="Jenis transaksi"
            :data-ready="pillReady || undefined"
            class="tx-pill relative flex gap-0.5 rounded-full bg-fill p-0.5"
          >
            <span
              class="tx-pill-hl absolute left-0 top-0.5 h-8 rounded-full bg-[var(--seg-on)]"
              :style="hlStyle"
              aria-hidden="true"
            />
            <button
              v-for="t in TYPES"
              :key="t.value"
              type="button"
              role="radio"
              :aria-checked="form.type === t.value"
              :aria-label="t.label"
              :class="[
                'tx-pill-btn relative flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] text-[13.5px] font-semibold active:scale-95',
                form.type === t.value ? t.tone : 'text-ter',
              ]"
              @click="form.type = t.value"
            >
              <component :is="t.icon" class="size-[18px]" stroke-width="2.3" aria-hidden="true" />
              <span v-if="form.type === t.value">{{ t.label }}</span>
            </button>
          </div>
          <b v-else class="text-bar font-semibold">Koreksi saldo</b>
        </div>
        <button
          v-if="!isAdjustment && canEdit"
          type="button"
          :aria-label="starred ? 'Sudah jadi bookmark' : 'Simpan sebagai bookmark'"
          :aria-pressed="starred"
          :disabled="!amount && !form.note"
          class="grid size-11 place-items-center rounded-xl text-primary-accent active:scale-90 active:bg-fill-press disabled:opacity-30"
          @click="saveAsBookmark"
        >
          <Star class="size-[21px]" :fill="starred ? 'currentColor' : 'none'" aria-hidden="true" />
        </button>
        <span v-else class="w-11" />
      </div>
    </header>

    <!-- Dialog: jenis di dalam form -->
    <div v-if="layout === 'dialog' && !isAdjustment" class="pb-3.5">
      <Segmented
        :model-value="form.type"
        :options="TYPES.map((t) => ({ value: t.value, label: t.label }))"
        label="Jenis transaksi"
        @update:model-value="(v) => (form.type = v as TxType)"
      />
    </div>

    <p
      v-if="isAdjustment"
      class="mx-4 mt-3.5 rounded-xl bg-card px-4 py-3 text-meta text-muted-foreground"
    >
      Transaksi ini dibuat oleh "Sesuaikan saldo" dan tidak dihitung di statistik. Untuk mengubah
      saldo lagi, pakai Sesuaikan saldo di halaman akun.
    </p>

    <div
      v-else
      :class="[
        'overflow-hidden bg-card',
        layout === 'dialog' ? 'rounded-group' : 'mt-0',
        layout === 'page' && panel && 'pb-[360px]',
      ]"
    >
      <!-- Tanggal + ulangi -->
      <div :class="['tx-row', panel === 'date' && 'is-on']">
        <span class="tx-label">Tanggal</span>
        <button
          type="button"
          :aria-expanded="panel === 'date'"
          :class="[
            'flex min-h-[52px] min-w-0 flex-1 items-center gap-2 text-left text-row font-medium',
            panel === 'date' && 'text-primary-accent',
          ]"
          @click="openPanel('date')"
        >
          <span class="truncate">{{ dateLabel }}</span>
          <span :class="panel === 'date' ? '' : 'text-muted-foreground'"
            >· {{ form.time.replace(':', '.') }}</span
          >
        </button>
        <div v-if="!editing" class="relative">
          <button
            type="button"
            :aria-label="`Ulangi: ${repeatLabel}`"
            aria-haspopup="menu"
            :aria-expanded="repeatOpen"
            :class="[
              'tx-press relative grid size-11 place-items-center rounded-xl active:scale-90',
              repeatShort ? 'bg-primary-soft text-primary-accent' : 'text-ter',
            ]"
            @click="repeatOpen = !repeatOpen"
          >
            <Repeat class="size-5" stroke-width="2.1" aria-hidden="true" />
            <span
              v-if="repeatShort"
              class="absolute right-px top-[3px] grid h-4 min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[9.5px] font-bold text-primary-foreground"
              >{{ repeatShort }}</span
            >
          </button>
          <template v-if="repeatOpen">
            <div class="fixed inset-0 z-[19]" aria-hidden="true" @click="repeatOpen = false" />
            <div
              role="menu"
              aria-label="Ulangi"
              class="tx-menu absolute right-0 top-12 z-20 min-w-[210px] overflow-hidden rounded-[13px]"
            >
              <button
                v-for="o in REPEAT_OPTIONS"
                :key="o.value"
                type="button"
                role="menuitemradio"
                :aria-checked="!installment && repeat === o.value"
                class="flex h-[42px] w-full items-center gap-2.5 px-3.5 text-left text-row active:bg-[var(--glass-press)]"
                @click="pickRepeat(o.value)"
              >
                <span class="w-4 font-bold text-primary-accent">{{
                  !installment && repeat === o.value ? '✓' : ''
                }}</span
                >{{ o.label }}
              </button>
              <template v-if="form.type === 'expense'">
                <div class="h-1.5 bg-[var(--glass-press)]" />
                <button
                  type="button"
                  role="menuitem"
                  class="flex h-[42px] w-full items-center gap-2.5 px-3.5 text-left text-row active:bg-[var(--glass-press)]"
                  @click="openInstallment"
                >
                  <span class="w-4 font-bold text-primary-accent">{{ installment ? '✓' : '' }}</span
                  >Cicilan…
                </button>
              </template>
            </div>
          </template>
        </div>
      </div>

      <!-- Nominal -->
      <button
        type="button"
        :aria-expanded="panel === 'keypad'"
        :class="['tx-row w-full text-left', panel === 'keypad' && 'is-on']"
        @click="openPanel('keypad')"
      >
        <span class="tx-label">Nominal</span>
        <span class="flex min-h-[66px] flex-1 flex-col justify-center gap-px">
          <span class="min-h-4 text-meta text-muted-foreground">{{
            panel === 'keypad' ? expr : ''
          }}</span>
          <span
            :class="[
              'flex items-center text-[26px] font-bold leading-[1.1] tracking-[-0.03em]',
              AMOUNT_TONE[form.type],
            ]"
          >
            {{ formatRupiah(amount) }}
            <span v-if="panel === 'keypad'" class="tx-caret" aria-hidden="true" />
          </span>
        </span>
      </button>
      <button
        v-if="suggestedAmount"
        type="button"
        class="mx-4 mb-2 self-start rounded-lg bg-primary-soft px-2.5 py-1 text-meta font-semibold text-primary-accent"
        @click="tokens = fromAmount(suggestedAmount)"
      >
        Biasanya {{ formatRupiah(suggestedAmount) }} · pakai
      </button>

      <!-- Kategori & akun, atau Dari/Ke untuk transfer -->
      <template v-if="form.type !== 'transfer'">
        <button
          type="button"
          :aria-expanded="panel === 'category'"
          :class="['tx-row w-full text-left', panel === 'category' && 'is-on']"
          @click="openPanel('category')"
        >
          <span class="tx-label">Kategori</span>
          <span class="flex min-h-[52px] min-w-0 flex-1 items-center gap-2 text-row font-medium">
            <span
              v-if="categoryStyle"
              :class="[
                'grid size-[26px] shrink-0 place-items-center rounded-lg',
                TONE_CLASS[categoryStyle.tone],
              ]"
              aria-hidden="true"
            >
              <component :is="categoryStyle.icon" class="size-[14px]" />
            </span>
            <span v-if="categoryText" class="truncate">{{ categoryText }}</span>
            <span v-else class="font-normal text-ter">Pilih kategori</span>
          </span>
        </button>
        <button
          type="button"
          :aria-expanded="panel === 'account'"
          :class="['tx-row w-full text-left', panel === 'account' && 'is-on']"
          @click="openPanel('account')"
        >
          <span class="tx-label">Akun</span>
          <span class="flex min-h-[52px] min-w-0 flex-1 items-center truncate text-row font-medium">
            {{ accountName(form.accountId) || 'Pilih akun' }}
          </span>
        </button>
      </template>
      <template v-else>
        <div class="relative">
          <button
            type="button"
            :aria-expanded="panel === 'account'"
            :class="['tx-row w-full pr-16 text-left', panel === 'account' && 'is-on']"
            @click="openPanel('account')"
          >
            <span class="tx-label">Dari</span>
            <span
              class="flex min-h-[52px] min-w-0 flex-1 items-center truncate text-row font-medium"
            >
              {{ accountName(form.accountId) || 'Pilih akun asal' }}
            </span>
          </button>
          <button
            type="button"
            :aria-expanded="panel === 'to'"
            :class="['tx-row w-full pr-16 text-left', panel === 'to' && 'is-on']"
            @click="openPanel('to')"
          >
            <span class="tx-label">Ke</span>
            <span
              v-if="form.toAccountId"
              class="flex min-h-[52px] min-w-0 flex-1 items-center truncate text-row font-medium"
              >{{ accountName(form.toAccountId) }}</span
            >
            <span v-else class="flex min-h-[52px] flex-1 items-center text-row text-ter"
              >Pilih akun tujuan</span
            >
          </button>
          <button
            type="button"
            aria-label="Tukar akun asal dan tujuan"
            :disabled="!form.toAccountId"
            class="tx-swap absolute right-3.5 top-1/2 z-[2] -mt-[18px] grid size-9 place-items-center rounded-full bg-card text-primary-accent active:scale-90 disabled:opacity-40"
            @click="swapAccounts"
          >
            <ArrowDownUp class="size-[18px]" stroke-width="2.2" aria-hidden="true" />
          </button>
        </div>
        <div class="tx-row">
          <span class="tx-label">Biaya</span>
          <span class="flex-1 text-[14px] text-muted-foreground">{{
            feeOn
              ? `${formatRupiah(fee)} dari ${accountName(form.accountId) || 'akun asal'}`
              : 'Tanpa biaya admin'
          }}</span>
          <IosSwitch
            v-model="feeOn"
            label="Catat biaya transfer"
            class="mr-2"
            @update:model-value="(on) => on && !fee && (panel = 'fee')"
          />
        </div>
        <button
          v-if="feeOn"
          type="button"
          :aria-expanded="panel === 'fee'"
          :class="['tx-row w-full text-left', panel === 'fee' && 'is-on']"
          @click="openPanel('fee')"
        >
          <span class="tx-label">Nominal biaya</span>
          <span class="flex min-h-[52px] flex-1 items-center text-row font-medium">{{
            formatRupiah(fee)
          }}</span>
        </button>
      </template>

      <!-- Catatan & keterangan -->
      <label class="tx-row">
        <span class="tx-label">Catatan</span>
        <input
          ref="noteInput"
          v-model="form.note"
          type="text"
          maxlength="120"
          autocomplete="off"
          enterkeyhint="done"
          placeholder="Indomaret, Budi, Tokopedia"
          class="h-[50px] min-w-0 flex-1 bg-transparent text-row outline-none placeholder:text-ter"
          @focus="panel = null"
        />
      </label>
      <label class="tx-row">
        <span class="tx-label">Keterangan</span>
        <input
          v-model="form.description"
          type="text"
          maxlength="240"
          autocomplete="off"
          placeholder="Detail tambahan"
          class="h-[50px] min-w-0 flex-1 bg-transparent text-row outline-none placeholder:text-ter"
          @focus="panel = null"
        />
      </label>

      <!-- Pintasan impor (transaksi baru di HP) -->
      <div
        v-if="!editing && layout === 'page'"
        class="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]"
      >
        <button
          type="button"
          class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-fill px-3 text-meta font-semibold active:scale-95"
          @click="importFrom('photo')"
        >
          <Camera class="size-4" aria-hidden="true" />Dari foto struk
        </button>
        <button
          type="button"
          class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-fill px-3 text-meta font-semibold active:scale-95"
          @click="importFrom('bank')"
        >
          <FileText class="size-4" aria-hidden="true" />Dari mutasi bank
        </button>
      </div>
    </div>

    <div v-if="!isAdjustment" :class="layout === 'page' ? 'px-4' : ''">
      <LinkSection
        v-if="form.type === 'income'"
        v-model:links="links"
        class="mt-3.5"
        kind="income"
        :transaction="transaction"
        :amount="amount"
        :error="linkError"
        @fill-amount="(total) => (tokens = fromAmount(total))"
      />
      <LinkSection
        v-else-if="form.type === 'expense' && transaction?.type === 'expense'"
        v-model:links="links"
        class="mt-3.5"
        kind="expense"
        :transaction="transaction"
        :amount="amount"
        @reimburse="recordReimbursement"
      />
    </div>

    <!-- Tombol -->
    <div
      v-if="canEdit && !panel"
      :class="['flex flex-col gap-2.5 pt-[18px]', layout === 'page' ? 'px-4 pb-10' : '']"
    >
      <div v-if="!isAdjustment" class="flex gap-2.5">
        <IosButton type="submit" class="flex-1" :disabled="!canSave">{{
          editing ? 'Simpan perubahan' : 'Simpan'
        }}</IosButton>
        <IosButton
          v-if="!editing"
          variant="gray"
          class="w-[120px]"
          :disabled="!canSave"
          @click="save(true)"
          >Catat lagi</IosButton
        >
      </div>
      <div v-if="editing" class="flex gap-2.5">
        <IosButton v-if="!isAdjustment" variant="gray" class="flex-1" @click="copyOpen = true"
          >Salin</IosButton
        >
        <IosButton variant="gray" class="flex-1 !text-exp" @click="remove">Hapus</IosButton>
      </div>
    </div>

    <!-- Panel: menempel di bawah (HP) atau di dalam form (dialog) -->
    <component
      :is="layout === 'page' ? Dock : 'div'"
      v-if="panel"
      v-bind="
        layout === 'page'
          ? {
              title: panelTitle,
              hint: panel === 'keypad' || panel === 'fee' ? '+ − × ÷ bisa dipakai' : '',
              steps: stepIndex >= 0 ? { count: steps.length, active: stepIndex } : undefined,
              auto: panel === 'date',
            }
          : { class: 'mt-3.5 overflow-hidden rounded-group bg-[var(--kb-bg)]' }
      "
      @close="panel = null"
    >
      <div
        v-if="layout === 'dialog'"
        class="flex h-11 items-center bg-[var(--kb-head)] px-4 shadow-[inset_0_-0.5px_0_var(--kb-head-line)]"
      >
        <b class="flex-1 text-body font-semibold">{{ panelTitle }}</b>
        <button
          type="button"
          class="text-meta font-semibold text-primary-accent"
          @click="panel = null"
        >
          Selesai
        </button>
      </div>
      <Keypad
        v-if="panel === 'keypad' || panel === 'fee'"
        :has-operator="hasOperator(panel === 'fee' ? feeTokens : tokens)"
        @press="onKey"
      />
      <ChoiceGrid
        v-else-if="panel === 'category'"
        :key="`cat-${form.type}`"
        :items="categoryItems"
        :model-value="form.categoryId"
        label="Pilih kategori"
        @select="choose"
      />
      <ChoiceGrid
        v-else-if="panel === 'account' || panel === 'to'"
        :key="panel"
        :items="accountItems(panel === 'to' ? form.accountId : undefined)"
        :model-value="panel === 'to' ? form.toAccountId : form.accountId"
        :label="panel === 'to' ? 'Pilih akun tujuan' : 'Pilih akun'"
        @select="choose"
      />
      <DatePanel v-else-if="panel === 'date'" v-model:date="form.date" v-model:time="form.time" />
    </component>

    <!-- Cicilan -->
    <IosSheet v-model:open="installmentOpen" title="Cicilan">
      <p class="mb-2 mt-0 text-meta text-muted-foreground">
        Nominal {{ formatRupiah(amount) }} dibagi rata; cicilan pertama dicatat sekarang, sisanya
        tiap bulan di tanggal {{ Number(form.date.slice(8)) }}.
      </p>
      <button
        v-for="r in installmentRows"
        :key="r.months"
        type="button"
        :disabled="!r.plan"
        class="flex h-[50px] w-full items-center gap-2.5 px-1 text-left text-row shadow-[inset_0_-0.5px_0_var(--sep)] disabled:opacity-40"
        @click="pickInstallment(r.months)"
      >
        <span class="flex-1">{{ r.months }} bulan</span>
        <small class="text-[14px] text-muted-foreground">{{
          r.plan ? `${formatRupiah(r.plan.amount)}/bulan` : 'Isi nominal dulu'
        }}</small>
        <b v-if="installment === r.months" class="text-primary-accent">✓</b>
      </button>
      <template #footer>
        <IosButton block variant="gray" @click="pickInstallment(null)">Tanpa cicilan</IosButton>
      </template>
    </IosSheet>

    <!-- Salin -->
    <IosSheet v-model:open="copyOpen" title="Salin transaksi">
      <button
        type="button"
        class="flex h-[50px] w-full items-center px-1 text-left text-row shadow-[inset_0_-0.5px_0_var(--sep)]"
        @click="copy(false)"
      >
        Salin dengan tanggal hari ini
      </button>
      <button
        type="button"
        class="flex h-[50px] w-full items-center gap-2.5 px-1 text-left text-row"
        @click="copy(true)"
      >
        <span class="flex-1">Salin dengan tanggal asli</span>
        <small class="text-[14px] text-muted-foreground">{{ dateLabel }}</small>
      </button>
      <template #footer>
        <IosButton block variant="gray" @click="copyOpen = false">Batal</IosButton>
      </template>
    </IosSheet>
  </form>
</template>

<style scoped>
/* Baris form (mockup .fr/.fl): label 80px kiri, nilai kanan, garis dari 16px */
.tx-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: 0 8px 0 16px;
  background: var(--card);
}
.tx-row::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 0;
  bottom: 0;
  height: 0.5px;
  background: var(--sep);
}
/* Baris aktif: label beraksen + garis aksen 2px di bawah nilai */
.tx-row.is-on::after {
  left: 104px;
  right: 16px;
  height: 2px;
  border-radius: 2px;
  background: var(--primary-accent);
}
.tx-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 15px;
  color: var(--muted-foreground);
}
.tx-row.is-on .tx-label {
  color: var(--primary-accent);
}
.tx-caret {
  display: inline-block;
  width: 2px;
  height: 25px;
  margin-left: 3px;
  border-radius: 2px;
  background: var(--primary-accent);
  animation: tx-blink 1.1s steps(1) infinite;
}
@keyframes tx-blink {
  50% {
    opacity: 0;
  }
}
.tx-pill-hl {
  box-shadow: var(--shadow-seg);
}
.tx-pill[data-ready] .tx-pill-hl {
  transition:
    transform 250ms var(--ease-out),
    width 250ms var(--ease-out);
}
.tx-pill-btn,
.tx-press,
.tx-swap {
  transition: transform 140ms var(--ease-out);
}
.tx-swap {
  box-shadow:
    0 0 0 0.5px var(--sep),
    var(--shadow-seg);
}
.tx-menu {
  background: var(--glass-menu);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  box-shadow:
    var(--shadow-menu),
    0 0 0 0.5px var(--glass-menu-line);
  transform-origin: right top;
  transition:
    transform 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}
@starting-style {
  .tx-menu {
    opacity: 0;
    transform: scale(0.95);
  }
}
.tx-menu button + button {
  box-shadow: inset 0 0.5px 0 var(--glass-menu-line);
}
@media (prefers-reduced-motion: reduce) {
  .tx-pill[data-ready] .tx-pill-hl {
    transition: none;
  }
  .tx-menu {
    transition: opacity 150ms ease;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .tx-menu {
    background: var(--glass-menu-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
