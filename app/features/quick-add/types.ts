import type { Component, Ref } from 'vue';
import type { Tone } from '@/components/data/tone';

export type TxType = 'expense' | 'income' | 'transfer';
export type DraftDate = 'today' | 'yesterday';

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
  text: string;
  categoryId: string;
}

export interface Draft {
  type: TxType;
  amount: number;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  note: string;
  date: DraftDate;
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
}
