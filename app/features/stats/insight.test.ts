import { describe, expect, it } from 'vitest';
import type { InsightRow } from './api';
import { buildInsights } from './insight';

const row = (over: Partial<InsightRow> = {}): InsightRow => ({
  income: 6_750_000,
  expense: 6_404_659,
  prev_income: 6_800_000,
  prev_expense: 15_577_067,
  rise_category_id: 'food',
  rise_now: 349_492,
  rise_prev: 108_500,
  peak_day: '2026-09-17',
  peak_expense: 2_025_000,
  expense_days: 19,
  ...over,
});

// September 2026 WIB, sudah lewat
const SEP = {
  from: '2026-08-31T17:00:00.000Z',
  to: '2026-09-30T17:00:00.000Z',
  prevLabel: 'Agustus 2026',
  categoryLabel: (id: string) => (id === 'food' ? 'Food' : ''),
  now: new Date('2026-10-25T03:00:00Z'),
};

describe('ringkasan insight', () => {
  it('selisih dan rasio sama dengan hitungan manual', () => {
    const [net] = buildInsights(row(), SEP);
    expect(net).toMatchObject({
      kind: 'net',
      title: 'Selisih +Rp 345.341',
      detail: '5% dari pemasukan tersisa',
    });
  });

  it('perbandingan, rata-rata, kenaikan kategori, hari terbesar', () => {
    const lines = buildInsights(row(), SEP);
    expect(lines.map((l) => l.kind)).toEqual(['net', 'compare', 'pace', 'rise', 'peak']);
    expect(lines[1]!.title).toBe('Pengeluaran turun 59% dibanding Agustus 2026');
    expect(lines[2]).toMatchObject({
      title: 'Rata-rata Rp 213.489 per hari',
      detail: '19 dari 30 hari ada pengeluaran',
    });
    expect(lines[3]!.title).toBe('Food naik Rp 240.992');
    expect(lines[4]!.title).toBe('Hari terbesar: Kam, 17 Sep');
  });

  it('periode berjalan memberi proyeksi akhir periode', () => {
    const lines = buildInsights(row({ expense: 1_000_000 }), {
      ...SEP,
      now: new Date('2026-09-10T03:00:00Z'), // hari ke-10
    });
    expect(lines.find((l) => l.kind === 'compare')!.title).toBe(
      'Sejauh ini pengeluaran turun 94% dibanding Agustus 2026',
    );
    expect(lines.find((l) => l.kind === 'pace')).toMatchObject({
      title: 'Rata-rata Rp 100.000 per hari',
      detail: 'Kalau berlanjut, sekitar Rp 3.000.000 sampai akhir periode',
    });
  });

  it('tanpa pembagian dengan nol: tanpa pemasukan, tanpa periode sebelumnya, atau kosong', () => {
    const noIncome = buildInsights(row({ income: 0, prev_expense: 0 }), SEP);
    expect(noIncome[0]!.detail).toBe('Belum ada pemasukan di periode ini');
    expect(noIncome.map((l) => l.kind)).not.toContain('compare');
    expect(noIncome.map((l) => l.kind)).not.toContain('rise');
    expect(buildInsights(row({ income: 0, expense: 0 }), SEP)).toEqual([]);
    expect(buildInsights(null, SEP)).toEqual([]);
  });
});
