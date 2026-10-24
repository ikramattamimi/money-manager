import type { InjectionKey } from 'vue';
import { dayLabel } from '@/lib/time';
import { parseQuick } from './parser';
import type { Draft, QuickAddSource, TxType } from './types';

const SOURCE: InjectionKey<QuickAddSource> = Symbol('quick-add-source');

/** Dipanggil layout: sumber akun/kategori/template dan cara menyimpan */
export function provideQuickAddSource(source: QuickAddSource) {
  provide(SOURCE, source);
}

export function useQuickAddSource(): QuickAddSource {
  const source = inject(SOURCE);
  if (!source) throw new Error('QuickAddPanel butuh provideQuickAddSource() di layout');
  return source;
}

const blank = (accountId: string | null): Draft => ({
  type: 'expense',
  amount: 0,
  accountId,
  toAccountId: null,
  categoryId: null,
  note: '',
  occurredAt: null,
});

interface Touched {
  type: boolean;
  account: boolean;
  category: boolean;
}

/**
 * State form catat transaksi, satu untuk ketiga bentuk panel (sheet, dialog,
 * inline). Disimpan di useState supaya isian tidak hilang saat ukuran layar
 * berubah dan panel pindah bentuk.
 *
 * Isian akhir (`draft`) disusun dari, berurutan: yang terbaca dari ketikan,
 * pilihan manual (tap chip/grid), saran riwayat buku, lalu nilai bawaan.
 */
export function useQuickAdd() {
  const source = useQuickAddSource();
  const text = useState('qa:text', () => '');
  const mode = useState<'text' | 'keypad'>('qa:mode', () => 'text');
  const manual = useState<Draft>('qa:manual', () => blank(source.defaultAccountId.value));
  const touched = useState<Touched>('qa:touched', () => ({
    type: false,
    account: false,
    category: false,
  }));

  // Akun bawaan baru tersedia setelah data akun termuat
  watch(
    source.defaultAccountId,
    (id) => {
      if (!manual.value.accountId) manual.value.accountId = id;
    },
    { immediate: true },
  );

  const parsed = computed(() =>
    parseQuick(text.value, {
      accounts: source.accounts.value,
      categories: source.categories.value,
    }),
  );
  const note = computed(() => parsed.value.note);
  const suggestion = source.useSuggest?.(note) ?? ref(null);

  const draft = computed<Draft>(() => {
    const p = parsed.value;
    const s = suggestion.value;
    const m = manual.value;
    const t = touched.value;

    let type: TxType = p.type ?? m.type;
    if (!p.type && !t.type && s?.type === 'income' && m.type === 'expense') type = 'income';

    const kind = type === 'income' ? 'income' : 'expense';
    const suggestedCategory =
      s?.category_id &&
      source.categories.value.some((c) => c.id === s.category_id && c.kind === kind)
        ? s.category_id
        : null;

    return {
      type,
      amount: mode.value === 'keypad' ? m.amount : p.amount || m.amount,
      note: p.note || m.note,
      occurredAt: p.occurredAt ?? m.occurredAt,
      accountId: p.accountId ?? (t.account ? m.accountId : (s?.account_id ?? m.accountId)),
      toAccountId: p.toAccountId ?? m.toAccountId,
      categoryId:
        type === 'transfer'
          ? null
          : t.category
            ? m.categoryId
            : (suggestedCategory ?? p.categoryId ?? m.categoryId),
    };
  });

  /** Label chip tanggal: "Kemarin", "Sen, 19 Okt 19.30", atau "Hari ini" */
  const when = computed(
    () =>
      parsed.value.when ?? (draft.value.occurredAt ? dayLabel(draft.value.occurredAt) : 'Hari ini'),
  );

  /** Nominal yang biasa dipakai untuk catatan ini, kalau belum diisi */
  const suggestedAmount = computed(() =>
    !draft.value.amount && suggestion.value?.amount ? suggestion.value.amount : 0,
  );

  function setText(value: string) {
    text.value = value;
  }

  function setType(type: TxType) {
    manual.value.type = type;
    touched.value.type = true;
    // Ketikan yang menyebut jenis lain tetap menang; pilihan manual untuk sisanya
    if (parsed.value.type && parsed.value.type !== type)
      text.value = text.value.replace(/^\s*\+/, '');
  }

  function setAccount(id: string) {
    manual.value.accountId = id;
    touched.value.account = true;
    if (manual.value.toAccountId === id) manual.value.toAccountId = null;
  }
  function setToAccount(id: string) {
    manual.value.toAccountId = id;
  }
  function setCategory(id: string) {
    manual.value.categoryId = id || null;
    touched.value.category = true;
  }
  function setAmount(amount: number) {
    manual.value.amount = amount;
  }

  function toggleDate() {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    manual.value.occurredAt = manual.value.occurredAt ? null : yesterday;
  }

  function pressKey(key: string) {
    const digits = String(manual.value.amount || '');
    const next = key === 'del' ? digits.slice(0, -1) : (digits + key).slice(0, 12);
    manual.value.amount = Number(next) || 0;
  }

  /** Isi panel dari template/draf lain, lalu lanjut ketik atau keypad */
  function applyDraft(from: Draft) {
    text.value = '';
    manual.value = { ...from };
    touched.value = { type: true, account: !!from.accountId, category: !!from.categoryId };
  }

  const canSave = computed(
    () =>
      draft.value.amount > 0 &&
      !!draft.value.accountId &&
      (draft.value.type !== 'transfer' ||
        (!!draft.value.toAccountId && draft.value.toAccountId !== draft.value.accountId)),
  );

  function reset(keepAccount = false) {
    const accountId = keepAccount ? draft.value.accountId : source.defaultAccountId.value;
    const type = keepAccount ? draft.value.type : 'expense';
    manual.value = { ...blank(accountId), type };
    touched.value = { type: false, account: keepAccount, category: false };
    text.value = '';
  }

  /** Simpan; kembalikan info untuk toast + Urungkan */
  function save() {
    if (!canSave.value) return null;
    return source.save({ ...draft.value }) ?? null;
  }

  return {
    source,
    text,
    mode,
    draft,
    when,
    suggestedAmount,
    canSave,
    setText,
    setType,
    setAccount,
    setToAccount,
    setCategory,
    setAmount,
    toggleDate,
    pressKey,
    applyDraft,
    reset,
    save,
  };
}

/**
 * Bentuk panel yang aktif. Di layar lebar (>= 1024px) panel selalu terbuka di
 * kolom kanan Transaksi; di bawahnya panel dibuka sebagai sheet/dialog.
 */
export function useQuickAddUi() {
  const open = useState('qa:open', () => false);
  /** Bertambah setiap ada permintaan fokus ke input inline (pintasan N) */
  const focusTick = useState('qa:focus', () => 0);
  return { open, focusTick };
}
