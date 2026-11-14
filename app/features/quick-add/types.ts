import type { Component } from 'vue';
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


export interface Draft {
  type: TxType;
  amount: number;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  note: string;
  /** Keterangan tambahan (hanya dari Salin) */
  description?: string;
  /** Biaya transfer (hanya dari Salin) */
  fee?: number;
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

