import type { H3Event } from 'h3';
import { read, utils } from 'xlsx';
import { z } from 'zod';
import type { ParsedImport } from '#shared/types/import';
import { isRealbyteHeader, MAX_ROWS, parseRealbyte } from './realbyte';
import { supabaseForUser } from './supabase';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ACCOUNT_KINDS = [
  'cash',
  'bank',
  'ewallet',
  'card',
  'savings',
  'investment',
  'receivable',
  'loan',
  'other',
] as const;

const fieldsSchema = z.object({
  bookId: z.uuid('Buku tidak valid'),
  /** Grup akun pilihan user di preview: { "nama akun (huruf kecil)": kind } */
  kinds: z.record(z.string(), z.enum(ACCOUNT_KINDS)).default({}),
});

const fail = (statusMessage: string, statusCode = 400) =>
  createError({ statusCode, statusMessage });

/**
 * Baca form unggahan impor (multipart: file, bookId, kinds) dan parse isinya.
 * File hanya ada di memori selama request ini; tidak disimpan.
 */
export async function readRealbyteUpload(event: H3Event): Promise<{
  filename: string;
  rowCount: number;
  parsed: ParsedImport;
  fields: z.infer<typeof fieldsSchema>;
}> {
  // Tolak lebih dulu kalau belum login, sebelum file dibaca
  supabaseForUser(event);
  const length = Number(getHeader(event, 'content-length') ?? 0);
  if (length > MAX_FILE_BYTES + 64 * 1024) throw fail('File terlalu besar (maksimal 5 MB).', 413);

  const form = await readMultipartFormData(event);
  const file = form?.find((part) => part.name === 'file' && part.filename);
  if (!file) throw fail('Pilih file .xlsx hasil ekspor Realbyte.');
  if (file.data.byteLength > MAX_FILE_BYTES) throw fail('File terlalu besar (maksimal 5 MB).', 413);
  if (!/\.xlsx$/i.test(file.filename ?? '')) throw fail('File harus berformat .xlsx.');

  const text = (name: string) => form?.find((part) => part.name === name)?.data.toString('utf8');
  let kinds: unknown;
  try {
    kinds = JSON.parse(text('kinds') || '{}');
  } catch {
    throw fail('Pilihan grup akun tidak valid.');
  }
  const fields = fieldsSchema.safeParse({ bookId: text('bookId'), kinds });
  if (!fields.success) throw fail(fields.error.issues[0]?.message ?? 'Isian tidak valid.');

  let rows: unknown[][];
  try {
    const workbook = read(new Uint8Array(file.data), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ''];
    rows = sheet ? utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true }) : [];
  } catch {
    throw fail('File tidak bisa dibaca. Pastikan ini file Excel (.xlsx) yang tidak rusak.');
  }

  if (!rows.length || !isRealbyteHeader(rows[0] ?? [])) {
    throw fail(
      'Ini bukan file ekspor Realbyte. Pakai file Excel hasil ekspor (menu Backup) dari Realbyte Money Manager.',
    );
  }
  if (rows.length - 1 > MAX_ROWS) {
    throw fail(`File berisi ${rows.length - 1} baris, maksimal ${MAX_ROWS} baris per impor.`);
  }

  return {
    filename: file.filename ?? 'realbyte.xlsx',
    rowCount: rows.length - 1,
    parsed: await parseRealbyte(rows),
    fields: fields.data,
  };
}
