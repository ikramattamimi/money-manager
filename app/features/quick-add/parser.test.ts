import { describe, expect, it } from 'vitest';
import { parseAmount, parseAmountTerm, parseQuick } from './parser';
import type { QuickAccount, QuickCategory } from './types';

const accounts: QuickAccount[] = [
  { id: 'cash', name: 'Cash', aliases: ['cash', 'tunai'] },
  { id: 'bca', name: 'BCA', aliases: ['bca'] },
  { id: 'gopay', name: 'Gopay', aliases: ['gopay'] },
  { id: 'jago-utama', name: 'Jago - Utama', aliases: ['jago - utama'] },
  { id: 'jago-kuliah', name: 'Jago - Kuliah', aliases: ['jago - kuliah'] },
  { id: 'seabank', name: 'Seabank', aliases: ['seabank'] },
];
const icon = {} as QuickCategory['icon'];
const categories: QuickCategory[] = [
  { id: 'coffee', name: 'Kopi', kind: 'expense', icon, tone: 'r2', keywords: ['kopi'] },
  { id: 'fuel', name: 'Bensin', kind: 'expense', icon, tone: 'r5', keywords: ['bensin'] },
  { id: 'food', name: 'Makan', kind: 'expense', icon, tone: 'r1', keywords: ['makan'] },
  { id: 'salary', name: 'Gaji', kind: 'income', icon, tone: 'r3', keywords: ['gaji'] },
];

// Sabtu, 24 Okt 2026 14.05 WIB
const NOW = new Date('2026-10-24T07:05:00Z');
const parse = (text: string) => parseQuick(text, { accounts, categories }, NOW);
const wib = (iso: string | null) =>
  iso &&
  new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');

describe('nominal', () => {
  it.each([
    ['25000', 25000],
    ['25.000', 25000],
    ['1.250.000', 1_250_000],
    ['25rb', 25000],
    ['25 rb', 25000],
    ['25ribu', 25000],
    ['25k', 25000],
    ['2.5k', 2500],
    ['1,5jt', 1_500_000],
    ['1.5jt', 1_500_000],
    ['2jt', 2_000_000],
    ['3 juta', 3_000_000],
    ['12,5rb', 12500],
  ])('%s → %d', (raw, value) => {
    expect(parseAmountTerm(raw)).toBe(value);
  });

  it('ekspresi penjumlahan', () => {
    expect(parseAmount('20rb+5rb')).toBe(25000);
    expect(parse('parkir 2rb + 3rb').amount).toBe(5000);
    expect(parse('belanja 100rb+25.500').amount).toBe(125500);
  });

  it('tanpa nominal: amount 0, keyakinan rendah', () => {
    expect(parse('kopi gopay')).toMatchObject({ amount: 0, accountId: 'gopay' });
    expect(parse('kopi gopay').confidence).toBe(0.5);
    expect(parse('kopi').confidence).toBe(0.25);
  });

  it('angka kecil tanpa satuan tetap dipakai kalau satu-satunya', () => {
    expect(parse('es teh 5000').amount).toBe(5000);
  });

  it('memilih angka bersatuan, bukan jumlah porsi', () => {
    expect(parse('nasi 2 bungkus 30rb')).toMatchObject({ amount: 30000, note: 'nasi 2 bungkus' });
  });
});

describe('contoh di spec', () => {
  it('kopi 25rb gopay', () => {
    expect(parse('kopi 25rb gopay')).toMatchObject({
      amount: 25000,
      accountId: 'gopay',
      categoryId: 'coffee',
      note: 'kopi',
      type: null,
      occurredAt: null,
      confidence: 1,
    });
  });

  it('makan siang 35k', () => {
    expect(parse('makan siang 35k')).toMatchObject({
      amount: 35000,
      note: 'makan siang',
      categoryId: 'food',
      accountId: null,
    });
  });

  it('bensin 100rb kemarin', () => {
    const p = parse('bensin 100rb kemarin');
    expect(p).toMatchObject({
      amount: 100000,
      categoryId: 'fuel',
      note: 'bensin',
      when: 'Kemarin',
    });
    expect(wib(p.occurredAt)).toBe('2026-10-23 14:05');
  });

  it('bca > gopay 99rb', () => {
    expect(parse('bca > gopay 99rb')).toMatchObject({
      type: 'transfer',
      accountId: 'bca',
      toAccountId: 'gopay',
      amount: 99000,
      note: '',
      categoryId: null,
    });
  });

  it('+ gaji 5jt bca', () => {
    expect(parse('+ gaji 5jt bca')).toMatchObject({
      type: 'income',
      amount: 5_000_000,
      accountId: 'bca',
      categoryId: 'salary',
      note: 'gaji',
    });
  });
});

describe('jenis', () => {
  it('default pengeluaran (type null = ikut pilihan manual)', () => {
    expect(parse('rokok 30rb').type).toBeNull();
  });
  it('kata terima/masuk = pemasukan', () => {
    expect(parse('terima 200rb seabank')).toMatchObject({ type: 'income', amount: 200000 });
    expect(parse('masuk 50rb cash').type).toBe('income');
  });
  it('tf bca gopay', () => {
    expect(parse('tf bca gopay 50rb')).toMatchObject({
      type: 'transfer',
      accountId: 'bca',
      toAccountId: 'gopay',
    });
  });
  it('transfer bca ke gopay', () => {
    expect(parse('transfer bca ke gopay 100rb')).toMatchObject({
      type: 'transfer',
      accountId: 'bca',
      toAccountId: 'gopay',
      note: '',
    });
  });
  it('panah tanpa spasi', () => {
    expect(parse('gopay>bca 20rb')).toMatchObject({
      type: 'transfer',
      accountId: 'gopay',
      toAccountId: 'bca',
    });
    expect(parse('gopay->seabank 20rb')).toMatchObject({ toAccountId: 'seabank' });
  });
  it('"ke" di antara dua akun = transfer, tanpa kata tf', () => {
    expect(parse('bca ke gopay 25rb')).toMatchObject({
      type: 'transfer',
      accountId: 'bca',
      toAccountId: 'gopay',
      amount: 25000,
      note: '',
      categoryId: null,
    });
    expect(parse('25rb dari seabank ke jago utama')).toMatchObject({
      type: 'transfer',
      accountId: 'seabank',
      toAccountId: 'jago-utama',
    });
  });
  it('"ke" boleh di depan: akun setelahnya tetap tujuan', () => {
    expect(parse('ke gopay dari bca 50rb kemarin')).toMatchObject({
      type: 'transfer',
      accountId: 'bca',
      toAccountId: 'gopay',
      when: 'Kemarin',
    });
  });
  it('"ke" dengan satu akun bukan transfer', () => {
    expect(parse('ke bengkel 150rb bca')).toMatchObject({ type: null, accountId: 'bca' });
  });
  it('dua akun tanpa tanda transfer bukan transfer', () => {
    expect(parse('kopi gopay bca 20rb')).toMatchObject({ type: null, accountId: 'gopay' });
  });
});

describe('akun', () => {
  it('nama akun dengan tanda hubung, diketik tanpa', () => {
    expect(parse('spp 1jt jago kuliah')).toMatchObject({ accountId: 'jago-kuliah', note: 'spp' });
    expect(parse('belanja 50rb jago utama').accountId).toBe('jago-utama');
  });
  it('alias kedua dan huruf besar', () => {
    expect(parse('Nasi Padang 25rb TUNAI').accountId).toBe('cash');
  });
  it('salah ketik satu huruf', () => {
    expect(parse('kopi 20rb gopy').accountId).toBe('gopay');
    expect(parse('kopi 20rb seabnk').accountId).toBe('seabank');
  });
  it('kata pengisi "pakai" dibuang', () => {
    expect(parse('bakso 15rb pakai gopay')).toMatchObject({ note: 'bakso', accountId: 'gopay' });
    expect(parse('bakso 15rb via bca').note).toBe('bakso');
  });
  it('kata yang mirip tapi bukan akun tidak dicocokkan', () => {
    expect(parse('cashback 5rb').accountId).toBeNull();
  });
});

describe('waktu', () => {
  it('2 hari lalu', () => {
    expect(wib(parse('martabak 40rb 2 hari lalu').occurredAt)).toBe('2026-10-22 14:05');
  });
  it('3 hr yg lalu', () => {
    expect(wib(parse('laundry 30rb 3 hr yg lalu').occurredAt)).toBe('2026-10-21 14:05');
  });
  it('kemarin lusa', () => {
    expect(wib(parse('pulsa 50rb kemarin lusa').occurredAt)).toBe('2026-10-22 14:05');
  });
  it('nama hari: senin terakhir', () => {
    const p = parse('nonton 50rb senin');
    expect(wib(p.occurredAt)).toBe('2026-10-19 14:05');
    expect(p.when).toBe('Sen, 19 Okt');
  });
  it('hari ini sabtu = hari ini', () => {
    expect(wib(parse('kopi 20rb sabtu').occurredAt)).toBe('2026-10-24 14:05');
  });
  it('jumat dengan apostrof', () => {
    expect(wib(parse("jum'at sedekah 10rb").occurredAt)).toBe('2026-10-23 14:05');
  });
  it('tgl 12 bulan ini', () => {
    expect(wib(parse('listrik 200rb tgl 12').occurredAt)).toBe('2026-10-12 14:05');
  });
  it('tgl 30 belum lewat = bulan lalu', () => {
    expect(wib(parse('kos 1jt tgl 30').occurredAt)).toBe('2026-09-30 14:05');
  });
  it('tanggal dengan bulan', () => {
    expect(wib(parse('tiket 500rb tanggal 5/9').occurredAt)).toBe('2026-09-05 14:05');
  });
  it('jam 19.30 hari ini', () => {
    const p = parse('makan malam 45rb 19.30');
    expect(wib(p.occurredAt)).toBe('2026-10-24 19:30');
    expect(p).toMatchObject({ amount: 45000, when: 'Hari ini 19.30', note: 'makan malam' });
  });
  it('jam dengan titik dua dan kata jam', () => {
    expect(wib(parse('kopi 18rb 08:15').occurredAt)).toBe('2026-10-24 08:15');
    expect(wib(parse('kopi 18rb jam 7').occurredAt)).toBe('2026-10-24 07:00');
  });
  it('hari dan jam', () => {
    expect(wib(parse('bensin 50rb kemarin jam 21.10').occurredAt)).toBe('2026-10-23 21:10');
  });
  it('nominal bertitik tidak dibaca sebagai jam', () => {
    expect(parse('belanja 12.500').amount).toBe(12500);
    expect(parse('belanja 12.500').occurredAt).toBeNull();
  });
});

describe('catatan dan kategori', () => {
  it('sisa teks jadi catatan', () => {
    expect(parse('hangout camel kuning 120rb').note).toBe('hangout camel kuning');
  });
  it('kategori pemasukan tidak dipakai untuk pengeluaran biasa', () => {
    expect(parse('beli kopi 20rb').categoryId).toBe('coffee');
  });
  it('kategori tidak diisi untuk transfer', () => {
    expect(parse('tf bca gopay kopi 20rb').categoryId).toBeNull();
  });
  it('teks kosong', () => {
    expect(parse('')).toMatchObject({ amount: 0, note: '', accountId: null, confidence: 0 });
  });
});
