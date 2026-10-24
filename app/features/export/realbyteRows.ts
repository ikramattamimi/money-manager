/** Judul kolom sama dengan ekspor Realbyte supaya file bisa diimpor balik */
export const EXPORT_HEADER = [
  'Period',
  'Accounts',
  'Category',
  'Subcategory',
  'Note',
  'IDR',
  'Income/Expense',
  'Description',
  'Amount',
  'Currency',
  'Accounts',
];

export interface ExportTx {
  occurred_at: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  fee: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  is_adjustment: boolean;
  note: string;
  description: string;
}

export interface ExportLookup {
  account: (id: string | null) => string;
  /** Nama induk dan sub (sub kosong untuk kategori utama), emoji di depan kalau ada */
  category: (id: string | null) => { parent: string; child: string };
}

/** ISO UTC → serial Excel berisi jam dinding WIB (kebalikan serialToIso di server) */
export function isoToSerial(iso: string): number {
  const wallClock = new Date(iso).getTime() + 7 * 3_600_000;
  return (wallClock - Date.UTC(1899, 11, 30)) / 86_400_000;
}

/**
 * Baris Excel gaya Realbyte. Transfer jadi dua baris (Transfer-Out dan
 * Transfer-In); biaya transfer jadi baris pengeluaran "Biaya transfer".
 * Koreksi saldo jadi Expense/Income Balance dengan kategori Modified Bal.
 */
export function toRealbyteRows(list: ExportTx[], lookup: ExportLookup): unknown[][] {
  const rows: unknown[][] = [EXPORT_HEADER];
  const line = (
    t: ExportTx,
    account: string,
    category: string,
    sub: string,
    kind: string,
    amount = t.amount,
    note = t.note,
  ) => [
    isoToSerial(t.occurred_at),
    account,
    category,
    sub,
    note,
    amount,
    kind,
    t.description,
    amount,
    'IDR',
    amount,
  ];

  for (const t of list) {
    const account = lookup.account(t.account_id);
    if (t.type === 'transfer') {
      const to = lookup.account(t.to_account_id);
      rows.push(line(t, account, to, '', 'Transfer-Out'));
      rows.push(line(t, to, account, '', 'Transfer-In'));
      if (t.fee > 0)
        rows.push(line(t, account, 'Biaya transfer', '', 'Exp.', t.fee, `Biaya transfer ke ${to}`));
    } else if (t.is_adjustment) {
      rows.push(
        line(
          t,
          account,
          'Modified Bal.',
          '',
          t.type === 'expense' ? 'Expense Balance' : 'Income Balance',
        ),
      );
    } else {
      const { parent, child } = lookup.category(t.category_id);
      rows.push(
        line(t, account, parent || 'Other', child, t.type === 'expense' ? 'Exp.' : 'Income'),
      );
    }
  }
  return rows;
}
