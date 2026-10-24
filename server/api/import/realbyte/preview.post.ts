import type { ImportPreview } from '#shared/types/import';

// Unggah file → ringkasan sebelum disimpan. Tidak mengubah apa pun di buku.
export default defineEventHandler(async (event): Promise<ImportPreview> => {
  const { filename, rowCount, parsed, fields } = await readRealbyteUpload(event);
  const match = await matchWithBook(event, fields.bookId, parsed);
  const tx = parsed.transactions;

  const dates = tx.map((t) => t.occurredAt).sort();
  const fresh = tx.filter((t) => !match.duplicates.has(t.dedupeKey));
  const count = (f: (t: (typeof tx)[number]) => boolean) => fresh.filter(f).length;

  return {
    filename,
    rowCount,
    range: dates.length ? { from: dates[0]!, to: dates[dates.length - 1]! } : null,
    counts: {
      expense: count((t) => t.type === 'expense' && !t.isAdjustment),
      income: count((t) => t.type === 'income' && !t.isAdjustment),
      transfer: count((t) => t.type === 'transfer'),
      adjustment: count((t) => t.isAdjustment),
    },
    newCount: fresh.length,
    duplicates: tx.length - fresh.length,
    unpairedTransfers: parsed.unpairedTransfers,
    accounts: parsed.accounts.map((a) => ({
      ...a,
      existingId: match.accountIds.get(a.name.trim().toLowerCase()) ?? null,
    })),
    newCategories: match.newCategories,
    matchedCategories: match.matchedCategories,
    errors: parsed.errors,
  };
});
