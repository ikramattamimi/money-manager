import { z } from 'zod';
import type { BankPreview, ReconciledRow } from '#shared/types/bank';
import { parseStatement } from '../../../utils/bank';
import { extractPdfItems, type PdfItem } from '../../../utils/bank/pdf';
import { reconcile, type ExistingTx } from '../../../utils/reconcile';

const fieldsSchema = z.object({
  bookId: z.uuid('Buku tidak valid'),
  accountId: z.uuid('Pilih akun untuk mutasi ini'),
});

const fail = (statusMessage: string, statusCode = 400) =>
  createError({ statusCode, statusMessage });

const shiftDays = (ymd: string, days: number) =>
  new Date(Date.parse(`${ymd}T00:00:00+07:00`) + days * 86_400_000).toISOString();

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

  const dates = parsed.rows.map((r) => r.date).sort();
  const [accounts, existing] = await Promise.all([
    db.from('accounts').select('id, name').eq('book_id', bookId),
    db
      .from('transactions')
      .select('id, type, occurred_at, amount, fee, account_id, to_account_id, dedupe_key')
      .eq('book_id', bookId)
      .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      .gte('occurred_at', shiftDays(dates[0]!, -3))
      .lt('occurred_at', shiftDays(dates[dates.length - 1]!, 4))
      .limit(5000),
  ]);
  const error = accounts.error ?? existing.error;
  if (error) throw dbError(error);
  if (!accounts.data?.some((a) => a.id === accountId))
    throw fail('Akun tidak ditemukan di buku ini.');

  const known: ExistingTx[] = (existing.data ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    occurredAt: t.occurred_at,
    amount: t.amount,
    fee: t.fee,
    accountId: t.account_id,
    toAccountId: t.to_account_id,
    dedupeKey: t.dedupe_key,
  }));

  const rows = await reconcile({
    rows: parsed.rows,
    accountId,
    holder: parsed.holder,
    accounts: accounts.data,
    existing: known,
  });
  await markImported(db, bookId, rows);
  await suggest(db, bookId, rows);

  const sum = (d: 'in' | 'out') =>
    parsed.rows.filter((r) => r.direction === d).reduce((s, r) => s + r.amount, 0);
  return {
    bank: parsed.bank,
    filename: file.filename ?? 'mutasi.pdf',
    holder: parsed.holder,
    period: parsed.period,
    rows,
    totals: { in: sum('in'), out: sum('out') },
    declared: parsed.declared,
  };
});

type Db = ReturnType<typeof supabaseForUser>;

/** Mutasi yang pernah diimpor tapi tanggal catatannya sudah diubah ke luar rentang */
async function markImported(db: Db, bookId: string, rows: ReconciledRow[]) {
  const open = rows.filter((r) => r.status !== 'tercatat');
  if (!open.length) return;
  const { data, error } = await db.rpc('import_existing_keys', {
    p_book_id: bookId,
    p_keys: open.map((r) => r.dedupeKey),
  });
  if (error) throw dbError(error);
  const keys = new Set(data ?? []);
  for (const r of open) if (keys.has(r.dedupeKey)) r.status = 'tercatat';
}

/** Saran kategori dari riwayat untuk baris baru, satu panggilan per catatan unik */
async function suggest(db: Db, bookId: string, rows: ReconciledRow[]) {
  const fresh = rows.filter((r) => r.status === 'baru' || r.status === 'ragu');
  const notes = [...new Set(fresh.map((r) => r.note).filter((n) => n.length >= 3))].slice(0, 80);
  const results = new Map<string, { category_id: string | null; type: string | null }>();
  for (let i = 0; i < notes.length; i += 8) {
    await Promise.all(
      notes.slice(i, i + 8).map(async (note) => {
        const { data } = await db.rpc('suggest_from_note', { p_book_id: bookId, p_note: note });
        if (data?.[0]) results.set(note, data[0]);
      }),
    );
  }
  for (const r of fresh) {
    const hit = results.get(r.note);
    const type = r.direction === 'in' ? 'income' : 'expense';
    // Saran hanya dipakai kalau jenisnya searah dengan mutasi
    r.suggestion = { categoryId: hit?.type === type ? hit.category_id : null, type };
  }
}
