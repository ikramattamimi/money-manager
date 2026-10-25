import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { StatementRow } from '#shared/types/bank';

/**
 * Hasil baca satu gambar oleh Claude (structured output). Struk = satu
 * transaksi (total yang dibayar); screenshot riwayat (GoPay, ShopeePay,
 * m-banking) = satu baris per transaksi yang terlihat.
 */
export const OcrResultSchema = z.object({
  kind: z.enum(['receipt', 'history', 'other']),
  /** Nama aplikasi atau toko, mis. "GoPay", "Indomaret" */
  source: z.string(),
  transactions: z.array(
    z.object({
      /** YYYY-MM-DD */
      date: z.string(),
      /** HH:mm 24 jam, null kalau tidak terlihat */
      time: z.string().nullable(),
      /** Rupiah utuh */
      amount: z.number(),
      direction: z.enum(['in', 'out']),
      /** Pihak lawan: toko, merchant, nama orang */
      counterparty: z.string(),
      /** Keterangan singkat: jenis transaksi atau isi belanja */
      description: z.string(),
    }),
  ),
});
export type OcrResult = z.infer<typeof OcrResultSchema>;

const SYSTEM = `Kamu membaca foto struk belanja atau screenshot riwayat transaksi dari aplikasi Indonesia (GoPay, ShopeePay, OVO, DANA, m-banking) untuk aplikasi pencatat keuangan.

Aturan:
- Struk (kind "receipt"): satu transaksi saja, nominalnya total yang dibayar (setelah diskon, termasuk pajak/biaya layanan). Arah "out". counterparty = nama toko. description = ringkasan isi belanja, maksimal 60 karakter.
- Screenshot riwayat (kind "history"): satu baris per transaksi yang terlihat utuh, urut dari atas. Lewati transaksi yang gagal, dibatalkan, atau masih diproses. Uang masuk (top up, terima transfer, refund, cashback) = "in"; bayar, kirim, tarik = "out".
- Nominal dalam rupiah utuh tanpa titik/koma ("Rp25.000" = 25000, "Rp1,2 jt" = 1200000). Selalu positif; arah ditentukan oleh direction.
- Tanggal format YYYY-MM-DD menurut waktu Indonesia. Kalau tahun tidak tertulis, pakai tahun yang membuat tanggalnya paling dekat dengan hari ini dan tidak di masa depan. "Hari ini"/"Kemarin" dihitung dari tanggal hari ini yang diberikan.
- time format HH:mm 24 jam kalau terlihat, null kalau tidak.
- Jangan menebak transaksi yang tidak terlihat. Kalau gambar bukan struk atau riwayat transaksi, kind "other" dengan transactions kosong.`;

/** Panggil Claude untuk satu gambar. Melempar error HTTP yang bisa dibaca user. */
export async function readImageWithClaude(opts: {
  apiKey: string;
  model: string;
  image: { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' };
  today: string;
}): Promise<OcrResult> {
  const client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 1, timeout: 60_000 });
  try {
    const response = await client.messages.parse({
      model: opts.model,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: opts.image.mediaType, data: opts.image.data },
            },
            { type: 'text', text: `Hari ini ${opts.today} (WIB). Baca gambar ini.` },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(OcrResultSchema) },
    });
    if (response.stop_reason === 'refusal')
      throw createError({ statusCode: 422, statusMessage: 'Gambar ini tidak bisa dibaca.' });
    if (!response.parsed_output)
      throw createError({
        statusCode: 502,
        statusMessage: 'Hasil baca foto tidak lengkap. Coba lagi atau pakai foto yang lebih jelas.',
      });
    return response.parsed_output;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError)
      throw createError({
        statusCode: 429,
        statusMessage: 'Layanan baca foto sedang sibuk. Coba lagi sebentar lagi.',
      });
    if (error instanceof Anthropic.AuthenticationError)
      throw createError({
        statusCode: 503,
        statusMessage: 'Kunci API baca foto di server tidak valid.',
      });
    if (error instanceof Anthropic.BadRequestError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Foto tidak bisa diproses. Coba foto lain.',
      });
    if (error instanceof Anthropic.APIError)
      throw createError({
        statusCode: 502,
        statusMessage: 'Layanan baca foto sedang bermasalah. Coba lagi nanti.',
      });
    throw error;
  }
}

const isDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/**
 * Hasil AI → baris mutasi yang sama bentuknya dengan parser PDF. Baris yang
 * tidak masuk akal (tanggal salah atau di masa depan, nominal nol) dibuang.
 */
export function toStatementRows(result: OcrResult, today: string): StatementRow[] {
  const rows: StatementRow[] = [];
  for (const t of result.transactions) {
    const amount = Math.round(Math.abs(t.amount));
    if (!amount || !isDate(t.date) || t.date > today) continue;
    const time = t.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) ? t.time : null;
    rows.push({
      row: rows.length + 1,
      date: t.date,
      time,
      amount,
      direction: t.direction,
      counterparty: t.counterparty.trim().slice(0, 120) || result.source.trim().slice(0, 120),
      description: t.description.trim().slice(0, 200),
      balance: null,
    });
  }
  return rows;
}

/** Uint8Array → base64 tanpa Buffer (jalan di Workers) */
export function toBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i += 0x8000)
    binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Gabungkan baris dari beberapa foto. Screenshot riwayat yang saling tumpang
 * tindih memuat transaksi yang sama: baris kembar (tanggal, jam, arah, nominal,
 * pihak lawan) hanya diambil sebanyak kemunculan terbanyak di satu foto, jadi
 * dua transaksi kembar asli dalam satu foto tetap dua.
 */
export function mergePhotoRows(lists: StatementRow[][]): StatementRow[] {
  const kept = new Map<string, number>();
  const rows: StatementRow[] = [];
  for (const list of lists) {
    const seen = new Map<string, number>();
    for (const r of list) {
      const key = [r.date, r.time ?? '', r.direction, r.amount, r.counterparty.toLowerCase()].join(
        '|',
      );
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      if (n <= (kept.get(key) ?? 0)) continue;
      kept.set(key, n);
      rows.push({ ...r, row: rows.length + 1 });
    }
  }
  return rows;
}
