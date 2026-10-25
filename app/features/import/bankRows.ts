import type { BankCommitRow, ReconciledRow } from '#shared/types/bank';

/** Pilihan user untuk satu baris mutasi di layar pencocokan */
export interface BankChoice {
  /** Ikut disimpan */
  include: boolean;
  /** Dicatat sebagai transfer antar-akun sendiri */
  transfer: boolean;
  categoryId: string | null;
  counterAccountId: string | null;
}

/** Pilihan awal: baru dan transfer ikut, ragu dan tercatat tidak */
export function initialChoice(r: ReconciledRow): BankChoice {
  return {
    include: r.status === 'baru' || r.status === 'transfer',
    transfer: r.status === 'transfer',
    categoryId: r.suggestion?.categoryId ?? null,
    counterAccountId: r.counterAccountId,
  };
}

/** Baris yang belum bisa disimpan: transfer tanpa akun lawan */
export const needsAccount = (c: BankChoice) => c.include && c.transfer && !c.counterAccountId;

/** Bentuk yang dikirim ke server. Transfer masuk = dari akun lawan ke akun mutasi */
export function toCommitRow(r: ReconciledRow, c: BankChoice, accountId: string): BankCommitRow {
  const transfer = c.transfer && !!c.counterAccountId;
  return {
    occurredAt: `${r.date}T${r.time ?? '12:00'}:00+07:00`,
    type: transfer ? 'transfer' : r.direction === 'in' ? 'income' : 'expense',
    amount: r.amount,
    accountId: transfer && r.direction === 'in' ? c.counterAccountId! : accountId,
    toAccountId: transfer ? (r.direction === 'in' ? accountId : c.counterAccountId) : null,
    categoryId: transfer ? null : c.categoryId,
    note: r.note,
    description: [r.counterparty, r.description].filter(Boolean).join(' · '),
    dedupeKey: r.dedupeKey,
  };
}
