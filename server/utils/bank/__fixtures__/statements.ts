import type { PdfItem } from '../pdf';

/**
 * Tiruan teks PDF mutasi bank dengan tata letak (x, y, lebar) seperti file
 * aslinya, tapi seluruh isinya rekaan: nama, nomor rekening, dan ID transaksi
 * bukan milik siapa pun.
 */

const item = (page: number, x: number, y: number, str: string, w = str.length * 5): PdfItem => ({
  page,
  x,
  y,
  w,
  str,
});

/** Angka rata kanan: x dihitung dari tepi kanan */
const right = (page: number, edge: number, y: number, str: string) => {
  const w = str.length * 4.1;
  return item(page, Math.round((edge - w) * 10) / 10, y, str, w);
};

interface SeaRow {
  date: string;
  lines: string[];
  out?: string;
  in?: string;
  balance: string;
}

function seabankPage(page: number, headerY: number, rows: SeaRow[]): PdfItem[] {
  const out: PdfItem[] = [
    item(page, 459.8, 801.6, 'REKENING KORAN'),
    item(page, 296.1, headerY, 'KELUAR'),
    item(page, 327.2, headerY, '(IDR)', 15.6),
    item(page, 400.6, headerY, 'MASUK'),
    item(page, 429.7, headerY, '(IDR)', 15.6),
    item(page, 477.2, headerY, 'SALDO AKHIR'),
    item(page, 529.2, headerY, '(IDR)', 15.6),
    item(page, 48.5, headerY - 0.2, 'TANGGAL'),
    item(page, 148, headerY - 0.2, 'TRANSAKSI'),
  ];
  let y = headerY - 34;
  for (const r of rows) {
    r.lines.forEach((line, i) => out.push(item(page, 148, y + 6.5 - i * 11, line)));
    out.push(item(page, 48.5, y, r.date));
    if (r.out) out.push(right(page, 342.8, y, r.out));
    if (r.in) out.push(right(page, 445.3, y, r.in));
    out.push(right(page, 544.8, y, r.balance));
    y -= 42;
  }
  out.push(item(page, 479.9, 42.1, 'halaman'));
  return out;
}

export function seabankFixture(): PdfItem[] {
  return [
    item(1, 40, 723.8, 'BUDI SANTOSO'),
    item(1, 40, 704.8, 'NO. REKENING SEABANK: 900000000001'),
    item(1, 40, 637.7, 'INDONESIA'),
    item(1, 349.5, 650, 'cs@seabank.co.id'),
    item(1, 179.9, 574.3, '01 OCT 2026 00:00:00 sampai 25 OCT 2026 05:47:23'),
    item(1, 48.5, 512.8, 'TABUNGAN'),
    right(1, 240.4, 512.8, '300.000'),
    right(1, 342.9, 512.8, '262.000'),
    right(1, 445.3, 512.8, '542.023'),
    right(1, 544.8, 512.8, '580.023'),
    ...seabankPage(1, 402.6, [
      { date: '01 OCT', lines: ['Bunga Tabungan', 'Bunga'], in: '23', balance: '300.023' },
      { date: '01 OCT', lines: ['Toko Kopi', 'Pembayaran'], out: '42.000', balance: '258.023' },
      {
        date: '02 OCT',
        lines: ['Pengembalian Dana -', 'Toko Kopi', 'Pembayaran'],
        in: '42.000',
        balance: '300.023',
      },
    ]),
    ...seabankPage(2, 726.5, [
      {
        date: '03 OCT',
        lines: ['BUDI SANTOSO', 'JAGO 100000000002 Transfer'],
        out: '200.000',
        balance: '100.023',
      },
      {
        date: '05 OCT',
        lines: ['PT MAJU JAYA', 'BANK BCA 1234567890 Transfer'],
        in: '500.000',
        balance: '600.023',
      },
      { date: '06 OCT', lines: ['Warung Sate', 'Pembayaran'], out: '20.000', balance: '580.023' },
    ]),
  ];
}

interface JagoRow {
  date: string;
  time: string;
  source: string[];
  detail: string[];
  note: string[];
  amount: string;
  balance: string;
}

const JAGO_X = { date: 64, source: 260, detail: 576, note: 883, amount: 1360, balance: 1648 };

function jagoRow(page: number, y: number, r: JagoRow, skipSource = 0): PdfItem[] {
  return [
    item(page, JAGO_X.date, y, r.date),
    item(page, JAGO_X.date, y - 30, r.time),
    ...r.source.slice(skipSource).map((s, i) => item(page, JAGO_X.source, y - 5 - i * 30, s)),
    ...r.detail.map((s, i) => item(page, JAGO_X.detail, y - i * 30, s)),
    ...r.note.map((s, i) => item(page, JAGO_X.note, y - i * 36, s)),
    item(page, JAGO_X.amount, y, r.amount),
    item(page, JAGO_X.balance, y, r.balance),
  ];
}

function jagoHeader(page: number, y: number): PdfItem[] {
  return [
    item(page, 1133, y + 184, 'Pockets Transactions History'),
    item(page, 1558, y + 184, `Halaman ${page} dari 2`),
    item(page, 64, y, 'Tanggal & Waktu'),
    item(page, 260, y, 'Sumber/Tujuan'),
    item(page, 576, y, 'Rincian Transaksi'),
    item(page, 883, y, 'Catatan'),
    item(page, 1386, y, 'Jumlah'),
    item(page, 1734, y, 'Saldo'),
  ];
}

const gopay = (
  date: string,
  time: string,
  id: string,
  amount: string,
  balance: string,
): JagoRow => ({
  date,
  time,
  source: ['Transaksi GoPay', 'Tabungan', `${id}AbCdEfGh`, 'XyID-1'],
  detail: ['Pembayaran dengan Jago Pay', `ID# ${id}AbCdEfGhXyID-1`],
  note: ['004 - GoPay - Generic', 'Jago payment'],
  amount,
  balance,
});

export function jagoFixture(): PdfItem[] {
  const split = gopay('07 Okt 2026', '17.58', '0720261007105729', '-50.000', '650.000,50');
  return [
    item(1, 1651, 82, 'www.jago.com'),
    item(1, 64, 2700, 'BUDI SANTOSO'),
    item(1, 64, 2660, 'Belanja 100000000002'),
    item(1, 64, 2600, '01 Okt 2026 - 31 Okt 2026'),
    ...jagoHeader(1, 2327),
    ...jagoRow(1, 2255, {
      date: '01 Okt 2026',
      time: '09.00',
      source: ['Pencairan Dana dari', 'GoPay', 'DOMPET ANAK BANGSA'],
      detail: ['Pencairan Dana dari GoPay'],
      note: ['auto sweep'],
      amount: '+1.000.000',
      balance: '1.000.000,50',
    }),
    ...jagoRow(1, 2087, gopay('02 Okt 2026', '12.15', '0220261002051500', '-58.700', '941.300,50')),
    ...jagoRow(1, 1919, {
      ...gopay('03 Okt 2026', '20.41', '0320261003134100', '-35.707', '905.593,50'),
      note: ['004 - XL FlexMax 7GB', '28 Hari -', '081200000000'],
    }),
    ...jagoRow(1, 1751, {
      date: '05 Okt 2026',
      time: '08.30',
      source: ['Dana Darurat', 'Pindah uang antar', 'Kantong'],
      detail: ['Pindah uang antar Kantong'],
      note: [],
      amount: '-205.593',
      balance: '700.000,50',
    }),
    // Baris terbelah halaman: dua potongan teks tercetak di dasar halaman 1
    item(1, 260, 7, 'Transaksi GoPay'),
    item(1, 883, 7, '004 - GoPay - Generic'),
    ...jagoRow(2, 2586, split, 1),
    ...jagoHeader(2, 2327),
    ...jagoRow(2, 2255, {
      date: '09 Okt 2026',
      time: '19.02',
      source: ['Shopee Indonesia', 'ShopeePay'],
      detail: ['Pembayaran QRIS'],
      note: [],
      amount: '-150.000',
      balance: '500.000,50',
    }),
  ];
}
