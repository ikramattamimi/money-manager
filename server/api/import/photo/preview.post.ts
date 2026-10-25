import { z } from 'zod';
import type { BankPreview, ParsedStatement, PhotoReadResult } from '#shared/types/bank';
import { buildPreview } from '../../../utils/bankPreview';
import { mergePhotoRows, readImageWithClaude, toBase64, toStatementRows } from '../../../utils/ocr';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Foto per permintaan: cukup untuk satu sesi belanja atau beberapa layar riwayat */
const MAX_PHOTOS = 10;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const fieldsSchema = z.object({
  bookId: z.uuid('Buku tidak valid'),
  accountId: z.uuid('Pilih akun untuk transaksi di foto ini'),
});

const fail = (statusMessage: string, statusCode = 400) =>
  createError({ statusCode, statusMessage });

const todayWib = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

const messageOf = (error: unknown) =>
  (error as { statusMessage?: string })?.statusMessage || 'Foto tidak bisa dibaca.';

// Satu atau beberapa foto struk/screenshot → Claude membaca tiap foto → baris
// digabung (yang tumpang tindih dibuang) → draf yang dicocokkan dengan buku.
// Hanya dipanggil dari tombol "Baca dengan AI" (tindakan eksplisit user).
// Gambar hanya ada di memori selama request ini; tidak disimpan.
export default defineEventHandler(async (event): Promise<BankPreview> => {
  const db = supabaseForUser(event);
  const config = useRuntimeConfig(event);
  if (!config.anthropicApiKey)
    throw fail('Baca foto belum diaktifkan di server ini (kunci API belum diisi).', 503);

  const length = Number(getHeader(event, 'content-length') ?? 0);
  if (length > MAX_PHOTOS * MAX_IMAGE_BYTES + 64 * 1024)
    throw fail('Foto terlalu besar (maksimal 5 MB per foto).', 413);
  const form = await readMultipartFormData(event);
  const files = form?.filter((part) => part.name === 'file' && part.filename) ?? [];
  if (!files.length) throw fail('Pilih foto struk atau screenshot riwayat.');
  if (files.length > MAX_PHOTOS) throw fail(`Maksimal ${MAX_PHOTOS} foto sekali baca.`);
  const images = files.map((file) => {
    if (file.data.byteLength > MAX_IMAGE_BYTES)
      throw fail(`Foto ${file.filename} terlalu besar (maksimal 5 MB).`, 413);
    const mediaType = TYPES.find((t) => t === file.type);
    if (!mediaType) throw fail(`Foto ${file.filename} harus JPG, PNG, atau WebP.`);
    return { name: file.filename || 'foto.jpg', data: new Uint8Array(file.data), mediaType };
  });

  const text = (name: string) => form?.find((part) => part.name === name)?.data.toString('utf8');
  const fields = fieldsSchema.safeParse({ bookId: text('bookId'), accountId: text('accountId') });
  if (!fields.success) throw fail(fields.error.issues[0]?.message ?? 'Isian tidak valid.');
  const { bookId, accountId } = fields.data;

  // Jatah harian per user: satu per foto, diambil sebelum memanggil AI.
  // Kalau tidak cukup untuk semua foto, yang sudah diambil dikembalikan.
  const limit = Number(config.ocrDailyLimit) || 30;
  let quotaLeft = 0;
  for (let taken = 0; taken < images.length; taken++) {
    const quota = await db.rpc('ai_take_quota', { p_limit: limit });
    if (quota.error || quota.data < 0) {
      await refund(db, taken);
      if (quota.error) throw dbError(quota.error);
      throw fail(
        taken
          ? `Jatah baca foto hari ini tinggal ${taken}. Kurangi fotonya atau coba lagi besok.`
          : `Jatah baca foto hari ini sudah habis (${limit} foto per hari). Coba lagi besok.`,
        429,
      );
    }
    quotaLeft = quota.data;
  }

  const today = todayWib();
  const settled = await Promise.allSettled(
    images.map((image) =>
      readImageWithClaude({
        apiKey: config.anthropicApiKey,
        model: config.ocrModel || 'claude-haiku-5-5',
        image: { data: toBase64(image.data), mediaType: image.mediaType },
        today,
      }),
    ),
  );
  // Foto yang gagal dibaca AI tidak memakai jatah
  const failed = settled.filter((s) => s.status === 'rejected').length;
  if (failed) {
    await refund(db, failed);
    quotaLeft += failed;
  }

  const photos: PhotoReadResult[] = [];
  const lists = settled.map((s, i) => {
    const name = images[i]!.name;
    if (s.status === 'rejected') {
      photos.push({ name, rows: 0, error: messageOf(s.reason) });
      return [];
    }
    const rows = toStatementRows(s.value, today);
    photos.push({
      name,
      rows: rows.length,
      error: rows.length
        ? null
        : s.value.kind === 'other'
          ? 'Sepertinya bukan struk atau riwayat transaksi.'
          : 'Tidak ada transaksi yang terbaca.',
    });
    return rows;
  });

  const rows = mergePhotoRows(lists);
  if (!rows.length) {
    // Satu foto: pesan aslinya (status HTTP-nya ikut); beberapa foto: ringkas
    const [only] = settled;
    if (settled.length === 1 && only?.status === 'rejected') throw only.reason;
    throw fail(
      settled.length > 1
        ? 'Tidak ada transaksi yang terbaca di foto-foto ini.'
        : `Foto ini: ${photos[0]!.error!.toLowerCase()}`,
    );
  }

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
    filename: images.length === 1 ? images[0]!.name : `${images.length} foto`,
    keyPrefix: 'ph',
  });
  return { ...preview, quotaLeft, photos };
});

async function refund(db: ReturnType<typeof supabaseForUser>, count: number) {
  for (let i = 0; i < count; i++) await db.rpc('ai_refund_quota');
}
