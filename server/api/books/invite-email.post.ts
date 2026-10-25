import { z } from 'zod';

const bodySchema = z.object({ inviteId: z.uuid() });

const ROLE: Record<string, string> = { editor: 'editor', viewer: 'hanya lihat' };

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Kirim email undangan buku lewat Resend. Undangan dibaca dengan token user
 * (RLS: hanya pemilik buku yang bisa), jadi route ini tidak bisa dipakai untuk
 * mengirim email ke sembarang alamat. Tanpa NUXT_RESEND_API_KEY: { sent: false }.
 */
export default defineEventHandler(async (event): Promise<{ sent: boolean }> => {
  const db = supabaseForUser(event);
  const body = bodySchema.safeParse(await readBody(event));
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'Undangan tidak valid.' });

  const { resendApiKey, mailFrom } = useRuntimeConfig(event);
  if (!resendApiKey) return { sent: false };

  const { data: invite, error } = await db
    .from('book_invites')
    .select('email, token, role, accepted_at, books(name)')
    .eq('id', body.data.inviteId)
    .maybeSingle();
  if (error) throw dbError(error);
  if (!invite || invite.accepted_at) {
    throw createError({ statusCode: 404, statusMessage: 'Undangan tidak ditemukan.' });
  }

  const { data: me } = await db.auth.getUser();
  const inviter = me.user?.email?.split('@')[0] ?? 'Seseorang';
  const bookName = (invite.books as { name: string } | null)?.name ?? 'buku';
  const link = `${getRequestURL(event).origin}/invite/${invite.token}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f2f4f9;font-family:-apple-system,Segoe UI,sans-serif;color:#141a2e">
<div style="max-width:420px;margin:0 auto;padding:32px 20px">
<div style="background:#fff;border-radius:16px;padding:24px">
<p style="margin:0 0 4px;font-size:14px;color:#5d6680">Money Manager</p>
<h1 style="margin:0 0 12px;font-size:20px">${escape(inviter)} mengundangmu ke buku ${escape(bookName)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5">Kamu diundang sebagai <b>${ROLE[invite.role] ?? invite.role}</b>. Masuk dengan email ini (${escape(invite.email)}) untuk menerimanya. Undangan berlaku 7 hari.</p>
<a href="${link}" style="display:inline-block;background:#2f5cf0;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">Terima undangan</a>
<p style="margin:20px 0 0;font-size:12px;color:#8a93a8">Kalau tidak mengenal pengirimnya, abaikan email ini.</p>
</div></div></body></html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: mailFrom,
      to: [invite.email],
      subject: `Undangan ke buku ${bookName}`,
      html,
    }),
  });
  return { sent: response.ok };
});
