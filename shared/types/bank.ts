// Tipe impor mutasi bank, dipakai server route dan layar pencocokan.

export type BankId = 'seabank' | 'jago';

/** Satu baris mutasi, bentuk yang sama untuk semua bank */
export interface StatementRow {
  /** Urutan di file (mulai 1) */
  row: number;
  /** Tanggal WIB "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" WIB kalau bank mencantumkan jam */
  time: string | null;
  /** Rupiah utuh, selalu positif */
  amount: number;
  direction: 'in' | 'out';
  /** Pihak lawan / sumber-tujuan, mis. "Shopee", "MENEL CAFE" */
  counterparty: string;
  /** Jenis/rincian dari bank, mis. "Pembayaran", "Transfer" */
  description: string;
  /** Saldo setelah transaksi, kalau ada */
  balance: number | null;
}

export interface ParsedStatement {
  bank: BankId;
  /** Nama pemilik rekening di file (untuk mengenali transfer ke diri sendiri) */
  holder: string;
  accountNumber: string | null;
  /** Periode "YYYY-MM-DD", inklusif */
  period: { from: string; to: string } | null;
  rows: StatementRow[];
  /** Total yang tertera di file (kalau ada), untuk cek hasil parsing */
  declared: { in: number; out: number } | null;
}

export type ReconcileStatus = 'tercatat' | 'baru' | 'ragu' | 'transfer';

export interface ReconciledRow extends StatementRow {
  status: ReconcileStatus;
  /** Transaksi yang sudah ada dan dianggap sama (tercatat) atau mungkin sama (ragu) */
  matchIds: string[];
  /** Akun lawan untuk transfer ke/dari akun sendiri */
  counterAccountId: string | null;
  /** Catatan yang disarankan untuk transaksi baru */
  note: string;
  dedupeKey: string;
  /** Saran dari riwayat (suggest_from_note) */
  suggestion: { categoryId: string | null; type: 'income' | 'expense' | null } | null;
}

export interface BankPreview {
  bank: BankId;
  filename: string;
  holder: string;
  period: { from: string; to: string } | null;
  rows: ReconciledRow[];
  totals: { in: number; out: number };
  declared: { in: number; out: number } | null;
}

/** Baris yang disimpan dari layar pencocokan */
export interface BankCommitRow {
  occurredAt: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  note: string;
  description: string;
  dedupeKey: string;
}

export interface BankCommitResult {
  batchId: string | null;
  inserted: number;
  duplicates: number;
}
