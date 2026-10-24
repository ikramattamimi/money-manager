// Tipe impor yang dipakai bersama server route dan layar impor.

export type AccountKind =
  'cash' | 'bank' | 'ewallet' | 'card' | 'savings' | 'investment' | 'receivable' | 'loan' | 'other';

export type ImportTxType = 'income' | 'expense' | 'transfer';

export interface ImportTransaction {
  /** Nomor baris di file (1 = baris pertama setelah judul kolom) */
  row: number;
  occurredAt: string;
  type: ImportTxType;
  amount: number;
  /** Nama akun sumber (pemasukan/pengeluaran: akun itu sendiri) */
  account: string;
  toAccount: string | null;
  /** Kunci kategori di `categories`, null untuk transfer/koreksi/tanpa kategori */
  category: string | null;
  note: string;
  description: string;
  isAdjustment: boolean;
  dedupeKey: string;
}

export interface ImportCategory {
  /** `expense:food` atau `expense:food/snacks` */
  key: string;
  kind: 'income' | 'expense';
  name: string;
  emoji: string;
  icon: string;
  tone: string;
  parentKey: string | null;
  count: number;
}

export interface ImportAccount {
  name: string;
  kind: AccountKind;
  count: number;
}

export interface ImportError {
  row: number;
  reason: string;
}

export interface ParsedImport {
  transactions: ImportTransaction[];
  accounts: ImportAccount[];
  categories: ImportCategory[];
  errors: ImportError[];
  /** Transfer yang tidak menemukan pasangannya (tetap diimpor dari satu sisi) */
  unpairedTransfers: number;
}

/** Ringkasan untuk layar preview */
export interface ImportPreview {
  filename: string;
  rowCount: number;
  range: { from: string; to: string } | null;
  counts: { expense: number; income: number; transfer: number; adjustment: number };
  /** Transaksi baru (tanpa duplikat) */
  newCount: number;
  duplicates: number;
  unpairedTransfers: number;
  /** Semua akun di file; `existingId` terisi kalau namanya sudah ada di buku */
  accounts: (ImportAccount & { existingId: string | null })[];
  /** Hanya kategori yang belum ada di buku */
  newCategories: ImportCategory[];
  matchedCategories: number;
  errors: ImportError[];
}

/** Hasil simpan impor */
export interface ImportResult {
  batchId: string | null;
  inserted: number;
  duplicates: number;
  accountsCreated: number;
  categoriesCreated: number;
}
