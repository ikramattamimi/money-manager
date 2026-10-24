import type { H3Event } from 'h3';
import type { ImportCategory, ParsedImport } from '#shared/types/import';
import { dbError, supabaseForUser } from './supabase';

const lower = (s: string) => s.trim().toLowerCase();

/**
 * Cocokkan hasil parsing dengan isi buku: akun dan kategori dengan nama yang
 * sama (tidak peka huruf besar/kecil), dan transaksi yang sudah pernah diimpor.
 */
export async function matchWithBook(event: H3Event, bookId: string, parsed: ParsedImport) {
  const db = supabaseForUser(event);

  const [accounts, categories] = await Promise.all([
    db.from('accounts').select('id, name').eq('book_id', bookId),
    db.from('categories').select('id, name, kind, parent_id').eq('book_id', bookId),
  ]);
  const error = accounts.error ?? categories.error;
  if (error) throw dbError(error);

  const accountIds = new Map<string, string>();
  for (const a of accounts.data ?? [])
    if (!accountIds.has(lower(a.name))) accountIds.set(lower(a.name), a.id);

  // Kunci kategori buku dengan format yang sama dengan parser: kind:induk[/sub]
  const rows = categories.data ?? [];
  const byId = new Map(rows.map((c) => [c.id, c]));
  const existingKeys = new Set(
    rows.map((c) => {
      const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
      return parent
        ? `${c.kind}:${lower(parent.name)}/${lower(c.name)}`
        : `${c.kind}:${lower(c.name)}`;
    }),
  );
  const newCategories: ImportCategory[] = parsed.categories.filter((c) => !existingKeys.has(c.key));

  // Duplikat: kunci yang sudah ada di buku, dicek per 1.000 kunci
  const keys = parsed.transactions.map((t) => t.dedupeKey);
  const duplicates = new Set<string>();
  for (let i = 0; i < keys.length; i += 1000) {
    const { data, error: keyError } = await db.rpc('import_existing_keys', {
      p_book_id: bookId,
      p_keys: keys.slice(i, i + 1000),
    });
    if (keyError) throw dbError(keyError);
    for (const key of data ?? []) duplicates.add(key);
  }

  return {
    db,
    accountIds,
    newCategories,
    matchedCategories: parsed.categories.length - newCategories.length,
    duplicates,
  };
}
