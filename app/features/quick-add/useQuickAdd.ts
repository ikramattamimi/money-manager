import type { InjectionKey } from 'vue';
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
  date: 'today',
});

/**
 * State form catat transaksi, satu untuk ketiga bentuk panel (sheet, dialog,
 * inline). Disimpan di useState supaya isian tidak hilang saat ukuran layar
 * berubah dan panel pindah bentuk.
 *
 * Pilihan manual (tap segmented/chip) menjadi nilai dasar; ketikan di-parse
 * ulang setiap berubah dan menimpanya, jadi hasil ketikan sebelumnya tidak
 * terbawa.
 */
export function useQuickAdd() {
  const source = useQuickAddSource();
  const text = useState('qa:text', () => '');
  const mode = useState<'text' | 'keypad'>('qa:mode', () => 'text');
  const manual = useState<Draft>('qa:manual', () => blank(source.defaultAccountId.value));
  const draft = useState<Draft>('qa:draft', () => blank(source.defaultAccountId.value));

  function setText(value: string) {
    text.value = value;
    const p = parseQuick(value, {
      accounts: source.accounts.value,
      categories: source.categories.value,
    });
    draft.value = {
      type: p.type ?? manual.value.type,
      amount: p.amount,
      note: p.note,
      date: p.date ?? manual.value.date,
      accountId: p.accountId ?? manual.value.accountId,
      toAccountId: p.toAccountId ?? manual.value.toAccountId,
      categoryId: p.categoryId ?? manual.value.categoryId,
    };
  }

  function setType(type: TxType) {
    manual.value.type = type;
    draft.value.type = type;
  }

  function cycle<T>(list: T[], current: T): T {
    return list[(list.indexOf(current) + 1) % list.length]!;
  }

  // Tap chip memutar pilihan (pemilih daftar lengkap menyusul di fase 4)
  function cycleAccount() {
    const ids = source.accounts.value.map((a) => a.id);
    draft.value.accountId = manual.value.accountId = cycle(ids, draft.value.accountId ?? ids[0]!);
  }
  function cycleToAccount() {
    const ids = source.accounts.value.map((a) => a.id).filter((id) => id !== draft.value.accountId);
    draft.value.toAccountId = manual.value.toAccountId = cycle(
      ids,
      draft.value.toAccountId ?? ids[ids.length - 1]!,
    );
  }
  function cycleCategory() {
    const kind = draft.value.type === 'income' ? 'income' : 'expense';
    const ids = source.categories.value.filter((c) => c.kind === kind).map((c) => c.id);
    draft.value.categoryId = manual.value.categoryId = cycle(
      ids,
      draft.value.categoryId ?? ids[ids.length - 1]!,
    );
  }
  function toggleDate() {
    draft.value.date = manual.value.date = draft.value.date === 'today' ? 'yesterday' : 'today';
  }

  function pressKey(key: string) {
    const digits = String(draft.value.amount || '');
    const next = key === 'del' ? digits.slice(0, -1) : (digits + key).slice(0, 12);
    draft.value.amount = Number(next) || 0;
  }

  const canSave = computed(
    () => draft.value.amount > 0 && (draft.value.type !== 'transfer' || !!draft.value.toAccountId),
  );

  function reset(keepAccount = false) {
    const accountId = keepAccount ? draft.value.accountId : source.defaultAccountId.value;
    const type = keepAccount ? draft.value.type : 'expense';
    manual.value = { ...blank(accountId), type };
    draft.value = { ...manual.value };
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
    canSave,
    setText,
    setType,
    cycleAccount,
    cycleToAccount,
    cycleCategory,
    toggleDate,
    pressKey,
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
