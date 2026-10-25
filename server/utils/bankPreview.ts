import type { BankPreview, ParsedStatement, ReconciledRow } from '#shared/types/bank';
import { reconcile, type ExistingTx } from './reconcile';
import { dbError, type supabaseForUser } from './supabase';

type Db = ReturnType<typeof supabaseForUser>;

const shiftDays = (ymd: string, days: number) =>
  new Date(Date.parse(`${ymd}T00:00:00+07:00`) + days * 86_400_000).toISOString();

/**
 * Baris hasil baca (PDF mutasi atau foto) → baris yang sudah dicocokkan dengan
 * transaksi di akun itu, ditandai yang pernah diimpor, dan diberi saran kategori.
 * `keyPrefix` membedakan dedupe_key mutasi bank ('bk') dan foto ('ph').
 */
export async function buildPreview(
  db: Db,
  input: {
    bookId: string;
    accountId: string;
    parsed: ParsedStatement;
    filename: string;
    keyPrefix: 'bk' | 'ph';
  },
): Promise<BankPreview> {
  const { bookId, accountId, parsed } = input;
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
    throw createError({ statusCode: 400, statusMessage: 'Akun tidak ditemukan di buku ini.' });

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
    keyPrefix: input.keyPrefix,
  });
  await markImported(db, bookId, rows);
  await suggest(db, bookId, rows);

  const sum = (d: 'in' | 'out') =>
    parsed.rows.filter((r) => r.direction === d).reduce((s, r) => s + r.amount, 0);
  return {
    bank: parsed.bank,
    filename: input.filename,
    holder: parsed.holder,
    period: parsed.period,
    rows,
    totals: { in: sum('in'), out: sum('out') },
    declared: parsed.declared,
  };
}

/** Baris yang pernah diimpor tapi tanggal catatannya sudah diubah ke luar rentang */
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
