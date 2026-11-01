import { booksApi } from '@/features/books/api';
import type { Tables } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';
import { uuid } from '@/lib/uuid';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  remapBackup,
  type BookBackup,
  type RestoreRows,
} from './backup';

type BookTable =
  | 'account_groups'
  | 'account_totals'
  | 'accounts'
  | 'categories'
  | 'recurring_rules'
  | 'transactions'
  | 'transaction_offsets'
  | 'budgets'
  | 'templates';

const PAGE = 1000;

/** Semua baris satu tabel milik buku, dibaca bertahap supaya tidak terpotong batas API */
async function readAll<T extends BookTable>(table: T, bookId: string): Promise<Tables<T>[]> {
  const rows: Tables<T>[] = [];
  for (let from = 0; ; from += PAGE) {
    // Semua tabel ini punya book_id dan id; tipe satu tabel cukup untuk menyusun query
    const { data, error } = await useSupabase()
      .from(table as 'transactions')
      .select('*')
      .eq('book_id', bookId)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error('Gagal membaca data untuk backup.', { cause: error });
    rows.push(...(data as unknown as Tables<T>[]));
    if (data.length < PAGE) return rows;
  }
}

/** Sisipkan bertahap (500 baris) supaya permintaan tidak terlalu besar */
async function insertAll(table: BookTable, rows: object[], onProgress: () => void) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await useSupabase()
      .from(table)
      .insert(rows.slice(i, i + 500) as never);
    if (error) throw new Error('Gagal memulihkan backup.', { cause: error });
    onProgress();
  }
}

export const backupApi = {
  /** Isi lengkap satu buku sebagai backup */
  async export(book: Tables<'books'>): Promise<BookBackup> {
    const id = book.id;
    const [
      accountGroups,
      accountTotals,
      accounts,
      categories,
      recurringRules,
      transactions,
      transactionOffsets,
      budgets,
      templates,
    ] = await Promise.all([
      readAll('account_groups', id),
      readAll('account_totals', id),
      readAll('accounts', id),
      readAll('categories', id),
      readAll('recurring_rules', id),
      readAll('transactions', id),
      readAll('transaction_offsets', id),
      readAll('budgets', id),
      readAll('templates', id),
    ]);
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      book: { name: book.name, month_start_day: book.month_start_day, currency: book.currency },
      accountGroups,
      accountTotals,
      accounts,
      categories,
      recurringRules,
      transactions,
      transactionOffsets,
      budgets,
      templates,
    };
  },

  /**
   * Pulihkan ke buku BARU bernama `name`. Buku baru diisi kategori dan akun
   * bawaan oleh trigger; isian itu dihapus dulu supaya hasilnya sama persis
   * dengan backup. Buku lama tidak disentuh. Mengembalikan buku baru.
   */
  async restore(
    backup: BookBackup,
    name: string,
    onProgress: (done: number, total: number) => void,
  ): Promise<Tables<'books'>> {
    const book = await booksApi.create(name);
    const supabase = useSupabase();
    if (backup.book.month_start_day !== 1)
      await booksApi.setMonthStartDay(book.id, backup.book.month_start_day);
    // Bawaan buku baru: akun dulu (mengacu grup), baru grup dan kategori
    for (const table of ['accounts', 'account_groups', 'categories'] as const) {
      const { error } = await supabase.from(table).delete().eq('book_id', book.id);
      if (error) throw new Error('Gagal menyiapkan buku baru.', { cause: error });
    }

    const rows: RestoreRows = remapBackup(backup, book.id, uuid);
    const order: [BookTable, object[]][] = [
      ['account_groups', rows.accountGroups],
      ['account_totals', rows.accountTotals],
      ['accounts', rows.accounts],
      ['categories', rows.categories],
      ['recurring_rules', rows.recurringRules],
      ['transactions', rows.transactions],
      ['transaction_offsets', rows.transactionOffsets],
      ['budgets', rows.budgets],
      ['templates', rows.templates],
    ];
    const total = order.reduce((s, [, list]) => s + Math.ceil(list.length / 500), 0) || 1;
    let done = 0;
    for (const [table, list] of order)
      await insertAll(table, list, () => onProgress(++done, total));
    return book;
  },
};
