import type { Tone } from '@/components/data/tone';
import { formatRupiah } from '@/lib/format';
import { DAYS_SHORT, jakartaParts, MONTHS_SHORT } from '@/lib/time';
import type { InsightRow } from './api';

export type InsightKind = 'net' | 'compare' | 'pace' | 'rise' | 'peak';

export interface InsightLine {
  kind: InsightKind;
  tone: Tone;
  title: string;
  detail: string;
}

interface Context {
  /** Periode terpilih, ISO [from, to) */
  from: string;
  to: string;
  /** Nama periode sebelumnya, mis. "September 2026" */
  prevLabel: string;
  categoryLabel: (id: string) => string;
  now?: Date;
}

const DAY_MS = 86_400_000;
const pct = (v: number) => `${Math.round(v * 100)}%`;

function dayName(ymd: string) {
  const d = jakartaParts(`${ymd}T12:00:00+07:00`);
  return `${DAYS_SHORT[d.weekday]}, ${d.day} ${MONTHS_SHORT[d.month - 1]}`;
}

/**
 * Kalimat ringkasan dari angka mentah period_insight. Netral dan berangka,
 * tidak menilai. Baris yang datanya tidak ada (atau pembagian dengan nol)
 * tidak dibuat; periode tanpa transaksi menghasilkan daftar kosong.
 */
export function buildInsights(row: InsightRow | null, ctx: Context): InsightLine[] {
  if (!row || (row.income === 0 && row.expense === 0)) return [];
  const lines: InsightLine[] = [];
  const net = row.income - row.expense;

  lines.push({
    kind: 'net',
    tone: net >= 0 ? 'ok' : 'bad',
    title: `Selisih ${net >= 0 ? '+' : '−'}${formatRupiah(Math.abs(net))}`,
    detail: row.income
      ? net >= 0
        ? `${pct(net / row.income)} dari pemasukan tersisa`
        : `Pengeluaran ${pct(row.expense / row.income)} dari pemasukan`
      : 'Belum ada pemasukan di periode ini',
  });

  // Periode yang masih berjalan dibanding periode sebelumnya yang sudah penuh: "sejauh ini"
  const nowMs = (ctx.now ?? new Date()).getTime();
  const running = nowMs >= Date.parse(ctx.from) && nowMs < Date.parse(ctx.to);
  if (row.prev_expense > 0 && row.expense > 0) {
    const change = (row.expense - row.prev_expense) / row.prev_expense;
    const flat = Math.abs(change) < 0.005;
    const subject = running ? 'Sejauh ini pengeluaran' : 'Pengeluaran';
    lines.push({
      kind: 'compare',
      tone: flat ? 'neutral' : change > 0 ? 'warn' : 'ok',
      title: flat
        ? `${subject} sama dengan ${ctx.prevLabel}`
        : `${subject} ${change > 0 ? 'naik' : 'turun'} ${pct(Math.abs(change))} dibanding ${ctx.prevLabel}`,
      detail: `${ctx.prevLabel} ${formatRupiah(row.prev_expense)} → ${running ? 'sejauh ini ' : ''}${formatRupiah(row.expense)}`,
    });
  }

  if (row.expense > 0) {
    const from = Date.parse(ctx.from);
    const to = Date.parse(ctx.to);
    const now = (ctx.now ?? new Date()).getTime();
    const totalDays = Math.max(1, Math.round((to - from) / DAY_MS));
    const ongoing = now >= from && now < to;
    const elapsed = ongoing
      ? Math.min(totalDays, Math.max(1, Math.ceil((now - from) / DAY_MS)))
      : totalDays;
    const perDay = row.expense / elapsed;
    lines.push({
      kind: 'pace',
      tone: 'neutral',
      title: `Rata-rata ${formatRupiah(Math.round(perDay))} per hari`,
      detail:
        ongoing && elapsed < totalDays
          ? `Kalau berlanjut, sekitar ${formatRupiah(Math.round(perDay * totalDays))} sampai akhir periode`
          : `${row.expense_days} dari ${totalDays} hari ada pengeluaran`,
    });
  }

  if (row.rise_category_id && row.rise_now != null && row.rise_prev != null) {
    const diff = row.rise_now - row.rise_prev;
    if (diff > 0 && row.prev_expense > 0) {
      lines.push({
        kind: 'rise',
        tone: 'warn',
        title: `${ctx.categoryLabel(row.rise_category_id) || 'Satu kategori'} naik ${formatRupiah(diff)}`,
        detail: `Kenaikan terbesar dibanding ${ctx.prevLabel}: ${formatRupiah(row.rise_prev)} → ${formatRupiah(row.rise_now)}`,
      });
    }
  }

  if (row.peak_day && row.peak_expense) {
    lines.push({
      kind: 'peak',
      tone: 'neutral',
      title: `Hari terbesar: ${dayName(row.peak_day)}`,
      detail: `${formatRupiah(row.peak_expense)} keluar dalam sehari${
        row.expense ? ` (${pct(row.peak_expense / row.expense)} dari periode ini)` : ''
      }`,
    });
  }

  return lines;
}
