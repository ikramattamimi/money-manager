import { z } from 'zod';
import type { BankCommitResult } from '#shared/types/bank';

const rowSchema = z
  .object({
    occurredAt: z.iso.datetime({ offset: true }),
    type: z.enum(['income', 'expense', 'transfer']),
    amount: z.number().int().positive(),
    accountId: z.uuid(),
    toAccountId: z.uuid().nullable(),
    categoryId: z.uuid().nullable(),
    note: z.string().max(200),
    description: z.string().max(500),
    dedupeKey: z.string().regex(/^(bk|ph):[0-9a-f]{40}$/),
  })
  .refine((r) => r.type !== 'transfer' || (r.toAccountId && r.toAccountId !== r.accountId), {
    message: 'Transfer perlu akun tujuan yang berbeda.',
  });

const bodySchema = z.object({
  bookId: z.uuid('Buku tidak valid'),
  filename: z.string().max(200).default(''),
  /** 'photo' = draf dari foto struk/screenshot (fase 11), selain itu mutasi bank */
  kind: z.enum(['bank', 'photo']).default('bank'),
  rows: z.array(rowSchema).min(1, 'Pilih minimal satu baris untuk disimpan.').max(2000),
});

// Simpan baris mutasi yang dipilih di layar pencocokan lewat satu RPC (semua
// atau tidak sama sekali). Baris yang pernah diimpor dilewati di database.
export default defineEventHandler(async (event): Promise<BankCommitResult> => {
  const db = supabaseForUser(event);
  const body = bodySchema.safeParse(await readBody(event));
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: body.error.issues[0]?.message ?? 'Isian tidak valid.',
    });
  }

  const { data, error } = await db.rpc('commit_bank_import', {
    p_book_id: body.data.bookId,
    p_payload: {
      kind: body.data.kind,
      filename: body.data.filename,
      transactions: body.data.rows.map((r) => ({
        occurred_at: r.occurredAt,
        type: r.type,
        amount: r.amount,
        account_id: r.accountId,
        to_account_id: r.toAccountId,
        category_id: r.categoryId,
        note: r.note,
        description: r.description,
        dedupe_key: r.dedupeKey,
      })),
    },
  });
  if (error) throw dbError(error);
  return data as unknown as BankCommitResult;
});
