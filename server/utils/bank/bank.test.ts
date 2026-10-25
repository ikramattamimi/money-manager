import { describe, expect, it } from 'vitest';
import type { ParsedStatement } from '#shared/types/bank';
import { jagoFixture, seabankFixture } from './__fixtures__/statements';
import { parseStatement } from './index';
import { isIdrAmount, parseIdr } from './pdf';

const total = (p: ParsedStatement, d: 'in' | 'out') =>
  p.rows.filter((r) => r.direction === d).reduce((s, r) => s + r.amount, 0);

/** Saldo tiap baris = saldo baris sebelumnya ± nominalnya */
const balanceBreaks = (p: ParsedStatement) =>
  p.rows.slice(1).filter((cur, i) => {
    const prev = p.rows[i]!;
    const expected = prev.balance! + (cur.direction === 'in' ? cur.amount : -cur.amount);
    return Math.abs(expected - cur.balance!) > 1;
  }).length;

describe('angka rupiah', () => {
  it('membaca titik ribuan, koma desimal, dan tanda', () => {
    expect(parseIdr('1.234.567')).toBe(1234567);
    expect(parseIdr('-58.700')).toBe(58700);
    expect(parseIdr('+1.000.000')).toBe(1000000);
    expect(parseIdr('14.865,49')).toBe(14865.49);
    expect(isIdrAmount('23')).toBe(true);
    expect(isIdrAmount('900000000001')).toBe(false);
    expect(isIdrAmount('02 OCT')).toBe(false);
  });
});

describe('SeaBank', () => {
  const p = parseStatement(seabankFixture())!;

  it('mengenali bank, pemilik, rekening, dan periode', () => {
    expect(p.bank).toBe('seabank');
    expect(p.holder).toBe('BUDI SANTOSO');
    expect(p.accountNumber).toBe('900000000001');
    expect(p.period).toEqual({ from: '2026-10-01', to: '2026-10-25' });
  });

  it('jumlah baris dan total cocok dengan ringkasan, saldo bersambung', () => {
    expect(p.rows).toHaveLength(6);
    expect(total(p, 'out')).toBe(262000);
    expect(total(p, 'in')).toBe(542023);
    expect(p.declared).toEqual({ out: 262000, in: 542023 });
    expect(balanceBreaks(p)).toBe(0);
  });

  it('memisahkan pihak lawan dan keterangan', () => {
    expect(p.rows[1]).toMatchObject({
      date: '2026-10-01',
      direction: 'out',
      amount: 42000,
      counterparty: 'Toko Kopi',
      description: 'Pembayaran',
    });
    // "Pengembalian Dana -" di atas nama merchant
    expect(p.rows[2]).toMatchObject({
      direction: 'in',
      counterparty: 'Toko Kopi',
      description: 'Pengembalian Dana',
    });
    expect(p.rows[3]).toMatchObject({
      date: '2026-10-03',
      counterparty: 'BUDI SANTOSO',
      description: 'JAGO 100000000002 Transfer',
    });
  });
});

describe('Jago', () => {
  const p = parseStatement(jagoFixture())!;

  it('mengenali bank, pemilik, rekening, dan periode', () => {
    expect(p.bank).toBe('jago');
    expect(p.holder).toBe('BUDI SANTOSO');
    expect(p.accountNumber).toBe('100000000002');
    expect(p.period).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('membaca semua baris termasuk yang terbelah halaman, saldo bersambung', () => {
    expect(p.rows).toHaveLength(6);
    expect(total(p, 'in')).toBe(1000000);
    expect(total(p, 'out')).toBe(500000);
    expect(balanceBreaks(p)).toBe(0);
    expect(p.rows[4]).toMatchObject({
      date: '2026-10-07',
      time: '17:58',
      amount: 50000,
      counterparty: 'Transaksi GoPay Tabungan',
    });
  });

  it('membuang ID transaksi, kode merchant, dan nomor telepon dari teks', () => {
    expect(p.rows[0]).toMatchObject({
      direction: 'in',
      time: '09:00',
      description: 'Pencairan Dana dari GoPay · auto sweep',
    });
    expect(p.rows[1]!.description).toBe('Pembayaran dengan Jago Pay · Jago payment');
    expect(p.rows[2]!.description).toBe('Pembayaran dengan Jago Pay · XL FlexMax 7GB 28 Hari');
    expect(p.rows[3]!.counterparty).toBe('Dana Darurat Pindah uang antar Kantong');
    for (const r of p.rows)
      expect(`${r.counterparty} ${r.description}`).not.toMatch(/ID-1|ID#|\d{8,}/);
  });
});

it('format yang tidak dikenal menghasilkan null', () => {
  expect(parseStatement([{ page: 1, x: 0, y: 0, w: 10, str: 'Laporan lain' }])).toBeNull();
});
