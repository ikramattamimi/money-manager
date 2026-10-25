import type { BankCommitResult, BankCommitRow, BankPreview } from '#shared/types/bank';
import type { AccountKind, ImportPreview, ImportResult } from '#shared/types/import';
import type { Tables } from '@/lib/database.types';
import { useSupabase } from '@/lib/supabase';

export type ImportBatch = Tables<'import_batches'>;

/** Pesan dari server route (statusMessage), atau pesan umum */
function serverMessage(error: unknown, fallback: string) {
  const data = (error as { data?: { statusMessage?: string; message?: string } })?.data;
  return data?.statusMessage || data?.message || fallback;
}

async function upload<T>(
  path: string,
  file: File,
  bookId: string,
  kinds: Record<string, AccountKind>,
): Promise<T> {
  const { data } = await useSupabase().auth.getSession();
  const body = new FormData();
  body.append('file', file);
  body.append('bookId', bookId);
  body.append('kinds', JSON.stringify(kinds));
  return $fetch<unknown>(path, {
    method: 'POST',
    body,
    headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {},
  }) as Promise<T>;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await useSupabase().auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export const importApi = {
  /** Unggah file Realbyte untuk dilihat dulu; belum ada yang disimpan */
  async preview(file: File, bookId: string): Promise<ImportPreview> {
    try {
      return await upload<ImportPreview>('/api/import/realbyte/preview', file, bookId, {});
    } catch (error) {
      throw new Error(serverMessage(error, 'Gagal membaca file.'), { cause: error });
    }
  },

  /** Simpan impor. `kinds` = grup akun pilihan user, kunci nama akun huruf kecil */
  async commit(
    file: File,
    bookId: string,
    kinds: Record<string, AccountKind>,
  ): Promise<ImportResult> {
    try {
      return await upload<ImportResult>('/api/import/realbyte/commit', file, bookId, kinds);
    } catch (error) {
      throw new Error(serverMessage(error, 'Gagal menyimpan impor.'), { cause: error });
    }
  },

  /** Unggah PDF mutasi untuk dicocokkan dengan buku; belum ada yang disimpan */
  /** `source`: 'pdf' mutasi bank, 'photo' struk/screenshot yang dibaca AI di server */
  async bankPreview(
    file: File,
    bookId: string,
    accountId: string,
    source: 'pdf' | 'photo' = 'pdf',
  ): Promise<BankPreview> {
    const body = new FormData();
    body.append('file', file);
    body.append('bookId', bookId);
    body.append('accountId', accountId);
    try {
      const path = source === 'photo' ? '/api/import/photo/preview' : '/api/import/bank/preview';
      return await $fetch<BankPreview>(path, {
        method: 'POST',
        body,
        headers: await authHeaders(),
      });
    } catch (error) {
      throw new Error(
        serverMessage(error, source === 'photo' ? 'Gagal membaca foto.' : 'Gagal membaca mutasi.'),
        { cause: error },
      );
    }
  },

  /** Simpan baris mutasi yang dipilih */
  async bankCommit(
    bookId: string,
    filename: string,
    rows: BankCommitRow[],
    kind: 'bank' | 'photo' = 'bank',
  ): Promise<BankCommitResult> {
    try {
      return await $fetch<BankCommitResult>('/api/import/bank/commit', {
        method: 'POST',
        body: { bookId, filename, rows, kind },
        headers: await authHeaders(),
      });
    } catch (error) {
      throw new Error(serverMessage(error, 'Gagal menyimpan mutasi.'), { cause: error });
    }
  },

  async history(bookId: string): Promise<ImportBatch[]> {
    const { data, error } = await useSupabase()
      .from('import_batches')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Gagal memuat riwayat impor.', { cause: error });
    return data;
  },

  /** Hapus semua transaksi dari satu impor; kembalikan jumlah yang dihapus */
  async revert(batchId: string): Promise<number> {
    const { data, error } = await useSupabase().rpc('revert_import', { p_batch_id: batchId });
    if (error) throw new Error('Gagal membatalkan impor.', { cause: error });
    return data;
  },
};
