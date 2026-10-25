import { z } from 'zod';
import type { BankPreview } from '#shared/types/bank';
import { parseStatement } from '../../../utils/bank';
import { extractPdfItems, type PdfItem } from '../../../utils/bank/pdf';

const fieldsSchema = z.object({
  bookId: z.uuid('Buku tidak valid'),
  accountId: z.uuid('Pilih akun untuk mutasi ini'),
});

const fail = (statusMessage: string, statusCode = 400) =>
  createError({ statusCode, statusMessage });

// Unggah PDF mutasi → baris yang sudah dicocokkan dengan buku. File hanya ada
// di memori selama request ini; tidak ada yang disimpan.
export default defineEventHandler(async (event): Promise<BankPreview> => {
  const db = supabaseForUser(event);
  const length = Number(getHeader(event, 'content-length') ?? 0);
  if (length > MAX_FILE_BYTES + 64 * 1024) throw fail('File terlalu besar (maksimal 5 MB).', 413);

  const form = await readMultipartFormData(event);
  const file = form?.find((part) => part.name === 'file' && part.filename);
  if (!file) throw fail('Pilih file PDF mutasi dari aplikasi bank.');
  if (file.data.byteLength > MAX_FILE_BYTES) throw fail('File terlalu besar (maksimal 5 MB).', 413);
  if (!/\.pdf$/i.test(file.filename ?? '')) throw fail('File harus berformat PDF.');

  const text = (name: string) => form?.find((part) => part.name === name)?.data.toString('utf8');
  const fields = fieldsSchema.safeParse({ bookId: text('bookId'), accountId: text('accountId') });
  if (!fields.success) throw fail(fields.error.issues[0]?.message ?? 'Isian tidak valid.');
  const { bookId, accountId } = fields.data;

  let items: PdfItem[];
  try {
    items = await extractPdfItems(new Uint8Array(file.data));
  } catch (error) {
    if (/password/i.test(String((error as Error)?.name ?? error)))
      throw fail(
        'PDF ini dikunci kata sandi. Unduh ulang mutasi tanpa kata sandi dari aplikasi bank.',
      );
    throw fail('File PDF tidak bisa dibaca.');
  }
  const parsed = parseStatement(items);
  if (!parsed)
    throw fail(
      'Format mutasi ini belum didukung. Saat ini: rekening koran SeaBank dan riwayat Kantong Jago.',
    );
  if (!parsed.rows.length) throw fail('Tidak ada transaksi di file ini.');

  return buildPreview(db, {
    bookId,
    accountId,
    parsed,
    filename: file.filename ?? 'mutasi.pdf',
    keyPrefix: 'bk',
  });
});
