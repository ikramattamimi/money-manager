import { z } from 'zod';
import type { BankPreview, ParsedStatement } from '#shared/types/bank';
import { buildPreview } from '../../../utils/bankPreview';
import { readImageWithClaude, toBase64, toStatementRows } from '../../../utils/ocr';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const fieldsSchema = z.object({
  bookId: z.uuid('Buku tidak valid'),
  accountId: z.uuid('Pilih akun untuk transaksi di foto ini'),
});

const fail = (statusMessage: string, statusCode = 400) =>
  createError({ statusCode, statusMessage });

const todayWib = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

// Foto struk/screenshot → Claude membaca → draf yang dicocokkan dengan buku.
// Hanya dipanggil dari tombol "Baca dengan AI" (tindakan eksplisit user).
// Gambar hanya ada di memori selama request ini; tidak disimpan.
export default defineEventHandler(async (event): Promise<BankPreview> => {
  const db = supabaseForUser(event);
  const config = useRuntimeConfig(event);
  if (!config.anthropicApiKey)
    throw fail('Baca foto belum diaktifkan di server ini (kunci API belum diisi).', 503);

  const length = Number(getHeader(event, 'content-length') ?? 0);
  if (length > MAX_IMAGE_BYTES + 64 * 1024) throw fail('Foto terlalu besar (maksimal 5 MB).', 413);
  const form = await readMultipartFormData(event);
  const file = form?.find((part) => part.name === 'file' && part.filename);
  if (!file) throw fail('Pilih foto struk atau screenshot riwayat.');
  if (file.data.byteLength > MAX_IMAGE_BYTES)
    throw fail('Foto terlalu besar (maksimal 5 MB).', 413);
  const mediaType = TYPES.find((t) => t === file.type);
  if (!mediaType) throw fail('Foto harus JPG, PNG, atau WebP.');

  const text = (name: string) => form?.find((part) => part.name === name)?.data.toString('utf8');
  const fields = fieldsSchema.safeParse({ bookId: text('bookId'), accountId: text('accountId') });
  if (!fields.success) throw fail(fields.error.issues[0]?.message ?? 'Isian tidak valid.');
  const { bookId, accountId } = fields.data;

  // Jatah harian per user diambil sebelum memanggil AI, dikembalikan kalau gagal
  const limit = Number(config.ocrDailyLimit) || 30;
  const quota = await db.rpc('ai_take_quota', { p_limit: limit });
  if (quota.error) throw dbError(quota.error);
  if (quota.data < 0)
    throw fail(
      `Jatah baca foto hari ini sudah habis (${limit} foto per hari). Coba lagi besok.`,
      429,
    );

  const today = todayWib();
  let result;
  try {
    result = await readImageWithClaude({
      apiKey: config.anthropicApiKey,
      model: config.ocrModel || 'claude-haiku-5-5',
      image: { data: toBase64(new Uint8Array(file.data)), mediaType },
      today,
    });
  } catch (error) {
    await db.rpc('ai_refund_quota');
    throw error;
  }

  const rows = toStatementRows(result, today);
  if (!rows.length)
    throw fail(
      result.kind === 'other'
        ? 'Foto ini sepertinya bukan struk atau riwayat transaksi.'
        : 'Tidak ada transaksi yang terbaca di foto ini.',
    );

  const dates = rows.map((r) => r.date).sort();
  const parsed: ParsedStatement = {
    bank: 'photo',
    holder: '',
    accountNumber: null,
    period: { from: dates[0]!, to: dates[dates.length - 1]! },
    rows,
    declared: null,
  };
  const preview = await buildPreview(db, {
    bookId,
    accountId,
    parsed,
    filename: file.filename || 'foto.jpg',
    keyPrefix: 'ph',
  });
  return { ...preview, quotaLeft: quota.data };
});
