import type { ImportResult } from '#shared/types/import';

// Simpan impor: file yang sama diunggah ulang bersama pilihan grup akun dari
// preview, di-parse lagi, lalu disimpan lewat satu RPC (semua atau tidak sama
// sekali). Duplikat dilewati di database.
export default defineEventHandler(async (event): Promise<ImportResult> => {
  const { filename, rowCount, parsed, fields } = await readRealbyteUpload(event);
  if (!parsed.transactions.length) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada transaksi yang bisa diimpor.' });
  }
  const db = supabaseForUser(event);

  const payload = {
    filename,
    row_count: rowCount,
    accounts: parsed.accounts.map((a) => ({
      name: a.name,
      kind: fields.kinds[a.name.trim().toLowerCase()] ?? a.kind,
    })),
    categories: parsed.categories.map((c) => ({
      key: c.key,
      kind: c.kind,
      name: c.name,
      emoji: c.emoji,
      icon: c.icon,
      tone: c.tone,
      parent_key: c.parentKey,
    })),
    transactions: parsed.transactions.map((t) => ({
      occurred_at: t.occurredAt,
      type: t.type,
      amount: t.amount,
      account: t.account,
      to_account: t.toAccount,
      category: t.category,
      note: t.note,
      description: t.description,
      is_adjustment: t.isAdjustment,
      dedupe_key: t.dedupeKey,
    })),
  };

  const { data, error } = await db.rpc('commit_import', {
    p_book_id: fields.bookId,
    p_payload: payload,
  });
  if (error) throw dbError(error);
  return data as unknown as ImportResult;
});
