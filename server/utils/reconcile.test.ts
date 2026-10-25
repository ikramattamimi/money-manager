import { describe, expect, it } from 'vitest';
import type { StatementRow } from '#shared/types/bank';
import { noteFor, occurredAtOf, reconcile, type ExistingTx } from './reconcile';

const ACC = 'acc-seabank';
const accounts = [
  { id: ACC, name: 'SeaBank' },
  { id: 'acc-jago', name: 'Jago' },
  { id: 'acc-gopay', name: 'GoPay' },
  { id: 'acc-darurat', name: 'Dana Darurat' },
  { id: 'acc-bca', name: 'BCA' },
];

let n = 0;
const row = (
  date: string,
  amount: number,
  direction: 'in' | 'out',
  counterparty = 'Toko',
  description = 'Pembayaran',
  time: string | null = null,
): StatementRow => ({
  row: ++n,
  date,
  time,
  amount,
  direction,
  counterparty,
  description,
  balance: 1_000_000 - n,
});

const tx = (
  id: string,
  date: string,
  amount: number,
  type: ExistingTx['type'] = 'expense',
  extra: Partial<ExistingTx> = {},
): ExistingTx => ({
  id,
  type,
  occurredAt: `${date}T10:00:00+07:00`,
  amount,
  fee: 0,
  accountId: ACC,
  toAccountId: null,
  dedupeKey: null,
  ...extra,
});

const run = (rows: StatementRow[], existing: ExistingTx[], holder = 'BUDI SANTOSO') =>
  reconcile({ rows, accountId: ACC, holder, accounts, existing });

describe('reconcile', () => {
  it('mutasi seminggu yang separuhnya sudah dicatat: separuh tercatat, sisanya baru', async () => {
    const rows = [
      row('2026-10-01', 25_000, 'out'),
      row('2026-10-02', 18_000, 'out'),
      row('2026-10-03', 42_000, 'out'),
      row('2026-10-04', 15_000, 'out'),
      row('2026-10-05', 60_000, 'out'),
      row('2026-10-06', 33_500, 'out'),
    ];
    const existing = [
      tx('a', '2026-10-01', 25_000),
      // Dicatat sehari lebih lambat
      tx('b', '2026-10-04', 42_000),
      tx('c', '2026-10-07', 33_500),
    ];
    const result = await run(rows, existing);
    expect(result.map((r) => r.status)).toEqual([
      'tercatat',
      'baru',
      'tercatat',
      'baru',
      'baru',
      'tercatat',
    ]);
    expect(result[2]!.matchIds).toEqual(['b']);
  });

  it('di luar ±2 hari, beda arah, atau beda akun tidak dicocokkan', async () => {
    const result = await run(
      [
        row('2026-10-01', 25_000, 'out'),
        row('2026-10-01', 50_000, 'out'),
        row('2026-10-01', 70_000, 'out'),
      ],
      [
        tx('a', '2026-10-04', 25_000),
        tx('b', '2026-10-01', 50_000, 'income'),
        tx('c', '2026-10-01', 70_000, 'expense', { accountId: 'acc-jago' }),
      ],
    );
    expect(result.map((r) => r.status)).toEqual(['baru', 'baru', 'baru']);
  });

  it('satu transaksi hanya dipakai satu baris; yang paling dekat menang', async () => {
    const result = await run(
      [row('2026-10-02', 21_000, 'out'), row('2026-10-04', 21_000, 'out')],
      [tx('a', '2026-10-03', 21_000), tx('b', '2026-10-04', 21_000)],
    );
    expect(result.map((r) => [r.status, r.matchIds])).toEqual([
      ['tercatat', ['a']],
      ['tercatat', ['b']],
    ]);
  });

  it('jam dari bank memilih catatan dengan jam terdekat', async () => {
    const result = await run(
      [row('2026-10-02', 21_000, 'out', 'Toko', 'x', '20:41')],
      [
        tx('pagi', '2026-10-02', 21_000),
        { ...tx('malam', '2026-10-02', 21_000), occurredAt: '2026-10-02T20:30:00+07:00' },
      ],
    );
    expect(result[0]!.matchIds).toEqual(['malam']);
  });

  it('dua kandidat sama dekat di tanggal berbeda ditandai ragu', async () => {
    const result = await run(
      [row('2026-10-03', 21_000, 'out')],
      [tx('a', '2026-10-02', 21_000), tx('b', '2026-10-04', 21_000)],
    );
    expect(result[0]!.status).toBe('ragu');
    expect(result[0]!.matchIds.sort()).toEqual(['a', 'b']);
  });

  it('transfer yang sudah dicatat dari sisi akun lain ikut dicocokkan, termasuk biayanya', async () => {
    const result = await run(
      [row('2026-10-05', 500_000, 'in'), row('2026-10-06', 202_500, 'out')],
      [
        tx('masuk', '2026-10-05', 500_000, 'transfer', { accountId: 'acc-bca', toAccountId: ACC }),
        tx('keluar', '2026-10-06', 200_000, 'transfer', { toAccountId: 'acc-jago', fee: 2_500 }),
      ],
    );
    expect(result.map((r) => r.matchIds)).toEqual([['masuk'], ['keluar']]);
  });

  it('mutasi yang pernah diimpor dikenali dari dedupe_key', async () => {
    const rows = [row('2026-10-01', 99_000, 'out')];
    const [first] = await run(rows, []);
    const result = await run(rows, [
      tx('lama', '2026-09-01', 1, 'expense', { dedupeKey: first!.dedupeKey }),
    ]);
    expect(result[0]).toMatchObject({ status: 'tercatat', matchIds: ['lama'] });
  });

  it('baris kembar persis mendapat dedupe_key berbeda', async () => {
    const twin = row('2026-10-01', 10_000, 'out');
    const result = await run([twin, { ...twin }], []);
    expect(result[0]!.dedupeKey).not.toBe(result[1]!.dedupeKey);
    expect(result[0]!.dedupeKey).toMatch(/^bk:[0-9a-f]{40}$/);
  });

  it('mengenali transfer ke akun sendiri', async () => {
    const result = await run(
      [
        row('2026-10-03', 200_000, 'out', 'BUDI SANTOSO', 'JAGO 100000000002 Transfer'),
        row('2026-10-03', 50_000, 'out', 'Gopay', 'Transfer'),
        row(
          '2026-10-05',
          205_593,
          'out',
          'Dana Darurat Pindah uang antar Kantong',
          'Pindah uang antar Kantong',
        ),
        row('2026-10-06', 75_000, 'out', 'BUDI S.', 'BANK BCA 1234567890 Transfer'),
        // Bayar pakai ShopeePay / transfer ke orang lain: bukan transfer sendiri
        row('2026-10-06', 30_000, 'out', 'ShopeePay', 'Pembayaran'),
        row('2026-10-07', 100_000, 'out', 'ANDI WIJAYA', 'BANK BCA 1234567890 Transfer'),
      ],
      [],
      'BUDI  SANTOSO',
    );
    expect(result.map((r) => [r.status, r.counterAccountId])).toEqual([
      ['transfer', 'acc-jago'],
      ['transfer', 'acc-gopay'],
      ['transfer', 'acc-darurat'],
      ['baru', null],
      ['baru', null],
      ['baru', null],
    ]);
  });

  it('nama kantong cocok dengan akun berawalan nama bank', async () => {
    const result = await reconcile({
      rows: [
        row(
          '2026-10-05',
          1_000,
          'in',
          'Dana Darurat Pindah uang antar Kantong',
          'Pindah uang antar Kantong',
        ),
      ],
      accountId: 'utama',
      holder: '',
      accounts: [
        { id: 'utama', name: 'Jago - Utama' },
        { id: 'darurat', name: 'Jago - Dana Darurat' },
      ],
      existing: [],
    });
    expect(result[0]).toMatchObject({ status: 'transfer', counterAccountId: 'darurat' });
  });
});

describe('catatan dan waktu', () => {
  it('memakai pihak lawan, kecuali baris GoPay yang generik', () => {
    expect(noteFor(row('2026-10-01', 1, 'out', 'MENEL CAFE'))).toBe('MENEL CAFE');
    expect(
      noteFor(
        row(
          '2026-10-01',
          1,
          'out',
          'Transaksi GoPay Tabungan',
          'Pembayaran dengan Jago Pay · Jago payment',
        ),
      ),
    ).toBe('GoPay');
    expect(
      noteFor(
        row(
          '2026-10-01',
          1,
          'out',
          'Transaksi GoPay Tabungan',
          'Pembayaran dengan Jago Pay · XL FlexMax 7GB 28 Hari',
        ),
      ),
    ).toBe('XL FlexMax 7GB 28 Hari');
    expect(noteFor(row('2026-10-01', 1, 'out', 'Dana Darurat Pindah uang antar Kantong'))).toBe(
      'Dana Darurat',
    );
  });

  it('waktu WIB, tengah hari kalau bank tidak mencantumkan jam', () => {
    expect(occurredAtOf(row('2026-10-01', 1, 'out'))).toBe('2026-10-01T12:00:00+07:00');
    expect(occurredAtOf(row('2026-10-01', 1, 'out', 'x', 'y', '20:41'))).toBe(
      '2026-10-01T20:41:00+07:00',
    );
  });
});
