import { beforeAll, describe, expect, it } from 'vitest';
import {
  guessAccountKind,
  isRealbyteHeader,
  parseRealbyte,
  REALBYTE_HEADER,
  serialToIso,
  splitEmoji,
} from './realbyte';

// Potongan ekspor Realbyte dengan nama dan nominal disamarkan.
// 46305.0154398 = 10 Okt 2026 00.22.14 WIB
const HEADER = [...REALBYTE_HEADER];
const T = 46305.01527777778; // 10 Okt 2026 00.22.00 WIB
const row = (
  period: number,
  account: string,
  category: string | null,
  sub: string | null,
  note: string | null,
  amount: number,
  kind: string,
  description: string | null = null,
) => [period, account, category, sub, note, amount, kind, description, amount, 'IDR', amount];

const SAMPLE = [
  HEADER,
  row(46305.01543981482, 'Bank A', '👤 Personal', '🛍️ Shopping', 'toko', 38648, 'Exp.', 'casing'),
  row(T, 'Bank A', 'Dompet B', null, null, 99000, 'Transfer-In'),
  row(T, 'Dompet B', 'Bank A', null, null, 99000, 'Transfer-Out'),
  row(46304.979375, 'Bank A', '🥘 Food', '🍟 Snacks', 'kopi', 25770, 'Exp.', 'kopi'),
  row(
    46304.97431712963,
    'Dompet B',
    'Modified Bal.',
    null,
    'Difference',
    212141,
    'Expense Balance',
  ),
  row(46304.5, 'Cash', 'Modified Bal.', null, null, 5000, 'Exp.'),
  row(46304.4, 'Bank A', '💰 Salary', null, 'kantor', 5_000_000, 'Income'),
  row(46304.3, 'Bank A', '🚬 Cigarette ', null, null, 30000, 'Exp.'),
  row(46304.2, 'Bank A', '🥘 Food', null, null, 15000, 'Exp.'),
];

describe('helper', () => {
  it('mengenali judul kolom Realbyte', async () => {
    expect(isRealbyteHeader(HEADER)).toBe(true);
    expect(isRealbyteHeader(['Tanggal', 'Akun'])).toBe(false);
  });

  it('serial Excel WIB → ISO UTC, dibulatkan ke detik', async () => {
    expect(serialToIso(46305.01543981482)).toBe('2026-10-09T17:22:14.000Z');
    expect(serialToIso(46305)).toBe('2026-10-09T17:00:00.000Z');
  });

  it('memisah emoji dari nama dan membuang spasi di ujung', async () => {
    expect(splitEmoji('🥘 Food')).toEqual({ emoji: '🥘', name: 'Food' });
    expect(splitEmoji('🚬 Cigarette ')).toEqual({ emoji: '🚬', name: 'Cigarette' });
    expect(splitEmoji('💲Admin')).toEqual({ emoji: '💲', name: 'Admin' });
    expect(splitEmoji('🧑‍🧑‍🧒‍🧒 Family')).toEqual({ emoji: '🧑‍🧑‍🧒‍🧒', name: 'Family' });
    expect(splitEmoji('💪🏻 Health')).toEqual({ emoji: '💪🏻', name: 'Health' });
    expect(splitEmoji('🅿️ Parkir')).toEqual({ emoji: '🅿️', name: 'Parkir' });
    expect(splitEmoji('Other')).toEqual({ emoji: '', name: 'Other' });
    expect(splitEmoji('3D Print')).toEqual({ emoji: '', name: '3D Print' });
  });

  it('menebak grup akun dari nama', async () => {
    expect(guessAccountKind('Cash - Dana Darurat')).toBe('cash');
    expect(guessAccountKind('Jago - Utama')).toBe('bank');
    expect(guessAccountKind('BBCA')).toBe('bank');
    expect(guessAccountKind('Gopay Saving (for Invest)')).toBe('ewallet');
    expect(guessAccountKind('Spay')).toBe('ewallet');
    expect(guessAccountKind('Bibit - Kuliah')).toBe('investment');
    expect(guessAccountKind('RDN Stockbit')).toBe('investment');
    expect(guessAccountKind('spotify kiki')).toBe('receivable');
    expect(guessAccountKind('Mamah')).toBe('other');
  });
});

describe('parseRealbyte', () => {
  let parsed: Awaited<ReturnType<typeof parseRealbyte>>;
  beforeAll(async () => {
    parsed = await parseRealbyte(SAMPLE);
  });

  it('menggabungkan Transfer-Out + Transfer-In jadi satu transfer', async () => {
    const transfers = parsed.transactions.filter((t) => t.type === 'transfer');
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({ account: 'Dompet B', toAccount: 'Bank A', amount: 99000 });
    expect(parsed.unpairedTransfers).toBe(0);
    // 10 baris - 1 judul - 1 Transfer-In yang digabung
    expect(parsed.transactions).toHaveLength(8);
  });

  it('koreksi saldo: Expense Balance dan kategori Modified Bal.', async () => {
    const adj = parsed.transactions.filter((t) => t.isAdjustment);
    expect(adj.map((t) => [t.account, t.type, t.amount, t.category])).toEqual([
      ['Dompet B', 'expense', 212141, null],
      ['Cash', 'expense', 5000, null],
    ]);
  });

  it('kategori 2 level dengan emoji terpisah, subkategori ikut warna induk', async () => {
    const food = parsed.categories.find((c) => c.key === 'expense:food')!;
    const snacks = parsed.categories.find((c) => c.key === 'expense:food/snacks')!;
    expect(food).toMatchObject({ name: 'Food', emoji: '🥘', icon: 'utensils', parentKey: null });
    expect(snacks).toMatchObject({ name: 'Snacks', parentKey: 'expense:food', tone: food.tone });
    expect(snacks.icon).toBe('cookie');
    expect(parsed.categories.find((c) => c.key === 'expense:cigarette')?.name).toBe('Cigarette');
    expect(parsed.categories.find((c) => c.key === 'income:salary')?.kind).toBe('income');
    // Baris "🥘 Food" tanpa sub memakai kategori induk
    expect(parsed.transactions.find((t) => t.amount === 15000)?.category).toBe('expense:food');
  });

  it('akun dari kolom Accounts dan dari lawan transfer', async () => {
    expect(parsed.accounts.map((a) => a.name).sort()).toEqual(['Bank A', 'Cash', 'Dompet B']);
  });

  it('kunci anti-dobel stabil dan unik', async () => {
    const again = await parseRealbyte(SAMPLE);
    expect(again.transactions.map((t) => t.dedupeKey)).toEqual(
      parsed.transactions.map((t) => t.dedupeKey),
    );
    expect(new Set(parsed.transactions.map((t) => t.dedupeKey)).size).toBe(8);
  });

  it('baris identik di file yang sama tetap masuk semua', async () => {
    const twin = row(46300.5, 'Cash', '🥘 Food', null, 'nasi', 10000, 'Exp.');
    const result = await parseRealbyte([HEADER, twin, twin]);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]!.dedupeKey).not.toBe(result.transactions[1]!.dedupeKey);
  });

  it('transfer tanpa pasangan tetap jadi transfer dan dihitung', async () => {
    const result = await parseRealbyte([
      HEADER,
      row(T, 'Bank A', 'Dompet B', null, null, 5000, 'Transfer-In'),
    ]);
    expect(result.transactions[0]).toMatchObject({
      type: 'transfer',
      account: 'Dompet B',
      toAccount: 'Bank A',
    });
    expect(result.unpairedTransfers).toBe(1);
  });

  it('baris rusak masuk daftar gagal dengan alasan', async () => {
    const result = await parseRealbyte([
      HEADER,
      ['kemarin', 'Cash', 'Food', null, null, 1000, 'Exp.'],
      [46300, 'Cash', 'Food', null, null, 0, 'Exp.'],
      [46300, 'Cash', 'Food', null, null, 1000, 'Loan'],
      [46300, '', 'Food', null, null, 1000, 'Exp.'],
    ]);
    expect(result.transactions).toHaveLength(0);
    expect(result.errors.map((e) => e.row)).toEqual([1, 2, 3, 4]);
    expect(result.errors[0]!.reason).toMatch(/Period/);
  });
});
