import type { Component, Ref } from 'vue';
import type { GridItem } from '@/components/data/GridPicker.vue';
import type { Tone } from '@/components/data/tone';

export type TxType = 'expense' | 'income' | 'transfer';

export interface QuickAccount {
  id: string;
  name: string;
  /** Kata yang dikenali di ketikan, mis. ["gopay"] */
  aliases: string[];
}

export interface QuickCategory {
  id: string;
  name: string;
  kind: 'income' | 'expense';
  icon: Component;
  tone: Tone;
  /** Kata di catatan yang mengarah ke kategori ini (fase 6: dari riwayat) */
  keywords: string[];
}

export interface QuickTemplate {
  id: string;
  label: string;
  categoryId: string | null;
  /** Prototipe: template berupa ketikan yang diisikan ke kolom */
  text?: string;
  /** Isian template (tanpa nominal: panel diisi lalu keypad dibuka) */
  draft?: Draft;
}

export interface Draft {
  type: TxType;
  amount: number;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  note: string;
  /** ISO UTC; null = sekarang (saat disimpan) */
  occurredAt: string | null;
  /** Pemasukan baru yang langsung mengganti pengeluaran ("Tandai sudah diganti") */
  links?: DraftLink[];
}

/** Kaitan ke pengeluaran yang diganti, di form pemasukan */
export interface DraftLink {
  expenseId: string;
  note: string;
  occurredAt: string;
  amount: number;
  /** Batas atas: sisa pengeluaran yang belum diganti (termasuk kaitan ini); null = tidak dimuat, dicek database */
  max: number | null;
}

/** Saran dari riwayat buku untuk catatan yang diketik (fase 6 T2) */
export interface QuickSuggestion {
  category_id: string | null;
  type: TxType | null;
  account_id: string | null;
  amount: number | null;
}

/** Sumber data dan aksi simpan untuk QuickAddPanel, disediakan oleh layout */
export interface QuickAddSource {
  accounts: Ref<QuickAccount[]>;
  categories: Ref<QuickCategory[]>;
  templates: Ref<QuickTemplate[]>;
  defaultAccountId: Ref<string | null>;
  save: (draft: Draft) => { undo: () => void; label: string } | null;
  /** Buka form lengkap dengan isian saat ini (tidak ada di prototipe) */
  openFull?: (draft: Draft) => void;
  /** Saran riwayat untuk catatan; dipanggil sekali di setup (tidak ada di prototipe) */
  useSuggest?: (note: Ref<string>) => Ref<QuickSuggestion | null>;
  /** Isi grid pilihan gaya Realbyte; tanpa ini panel memakai daftar datar */
  pickerItems?: {
    category: (kind: 'income' | 'expense') => GridItem[];
    account: (exclude?: string | null) => GridItem[];
  };
  /** Pakai template: simpan langsung atau isi panel (template tanpa nominal) */
  useTemplate?: (id: string) => { undo: () => void; label: string } | 'needs-amount' | null;
}
