import { describe, expect, it } from 'vitest';
import { cardBill, cycleOf, statementCycle } from './billing';

const at = (key: string) => `${key}T05:00:00Z`; // siang WIB

describe('periode tagihan kartu kredit', () => {
  it('cetak 25, jatuh tempo 10 bulan berikutnya', () => {
    expect(statementCycle(2026, 10, 25, 10)).toEqual({
      year: 2026,
      month: 10,
      start: '2026-09-26',
      end: '2026-10-25',
      due: '2026-11-10',
    });
  });

  it('jatuh tempo di bulan yang sama kalau harinya setelah tanggal cetak', () => {
    expect(statementCycle(2026, 10, 5, 20).due).toBe('2026-10-20');
  });

  it('tanggal cetak 31 jatuh ke hari terakhir bulan pendek', () => {
    expect(statementCycle(2027, 2, 31, 15)).toMatchObject({
      start: '2027-02-01',
      end: '2027-02-28',
    });
    expect(statementCycle(2027, 3, 31, 15).start).toBe('2027-03-01');
  });

  it('transaksi setelah tanggal cetak masuk tagihan bulan berikutnya', () => {
    expect(cycleOf('2026-10-25', 25)).toEqual({ year: 2026, month: 10 });
    expect(cycleOf('2026-10-26', 25)).toEqual({ year: 2026, month: 11 });
    expect(cycleOf('2026-12-30', 25)).toEqual({ year: 2027, month: 1 });
  });
});

describe('ringkasan tagihan', () => {
  // Hari ini 3 Nov; tagihan terakhir dicetak 25 Okt, jatuh tempo 10 Nov
  const rows = [
    { occurred_at: at('2026-11-02'), delta: -50_000 }, // belanja periode berjalan
    { occurred_at: at('2026-10-30'), delta: 300_000 }, // bayar sebagian
    { occurred_at: at('2026-10-20'), delta: -500_000 }, // masuk tagihan Okt
  ];

  it('utang saat cetak dihitung mundur dari saldo sekarang', () => {
    // Saldo sekarang −250.000 = −500.000 (saat cetak) + 300.000 − 50.000
    const bill = cardBill(rows, -250_000, '2026-11-03', 25, 10);
    expect(bill).toMatchObject({
      owed: 500_000,
      paid: 300_000,
      remaining: 200_000,
      currentCharges: 50_000,
      status: 'open',
    });
    expect(bill.last).toMatchObject({ end: '2026-10-25', due: '2026-11-10' });
    expect(bill.current).toMatchObject({ start: '2026-10-26', end: '2026-11-25' });
  });

  it('lunas, lewat jatuh tempo, dan tanpa tagihan', () => {
    expect(cardBill(rows, 250_000 - 500_000, '2026-11-11', 25, 10).status).toBe('overdue');
    const lunas = [{ occurred_at: at('2026-10-28'), delta: 500_000 }];
    expect(cardBill(lunas, 0, '2026-11-03', 25, 10)).toMatchObject({
      remaining: 0,
      status: 'paid',
    });
    expect(cardBill([], 0, '2026-11-03', 25, 10).status).toBe('none');
  });
});
