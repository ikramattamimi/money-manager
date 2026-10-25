import type { ParsedStatement, StatementRow } from '#shared/types/bank';
import { isIdrAmount, monthOf, parseIdr, ymd, type PdfItem } from './pdf';

/**
 * Rekening koran SeaBank (PDF dari aplikasi). Tiap baris: "01 OCT" di kolom
 * tanggal (tanpa jam), pihak lawan + jenis di kolom TRANSAKSI, lalu nominal di
 * kolom KELUAR atau MASUK dan SALDO AKHIR. Kolom angka ditentukan dari tepi
 * kanan teks yang paling dekat dengan tepi kanan judul "(IDR)" kolomnya.
 */
export function isSeabank(items: PdfItem[]): boolean {
  return (
    items.some((i) => i.str === 'REKENING KORAN') &&
    items.some((i) => /SEABANK/i.test(i.str) || /seabank\.co\.id/i.test(i.str))
  );
}

export function parseSeabank(items: PdfItem[]): ParsedStatement {
  const text = (re: RegExp) => items.find((i) => re.test(i.str))?.str ?? '';

  // Periode "01 OCT 2026 00:00:00 sampai 25 OCT 2026 05:47:23"
  const periodMatch = text(/sampai/).match(
    /(\d{2}) ([A-Z]{3}) (\d{4}).*sampai (\d{2}) ([A-Z]{3}) (\d{4})/i,
  );
  const start = periodMatch
    ? { d: +periodMatch[1]!, m: monthOf(periodMatch[2]!)!, y: +periodMatch[3]! }
    : null;
  const end = periodMatch
    ? { d: +periodMatch[4]!, m: monthOf(periodMatch[5]!)!, y: +periodMatch[6]! }
    : null;

  const holder =
    items.find(
      (i) =>
        i.page === 1 &&
        i.x < 100 &&
        /^[A-Z .']{6,}$/.test(i.str) &&
        !/REKENING|TABUNGAN|TANGGAL|INDONESIA/.test(i.str),
    )?.str ?? '';
  const accountNumber = text(/NO\. REKENING/).match(/(\d{6,})/)?.[1] ?? null;

  // Ringkasan: TABUNGAN saldo-awal keluar masuk saldo-akhir
  let declared: ParsedStatement['declared'] = null;
  const summaryLabel = items.find((i) => i.page === 1 && i.str === 'TABUNGAN');
  if (summaryLabel) {
    const nums = items
      .filter((i) => i.page === 1 && Math.abs(i.y - summaryLabel.y) < 3 && isIdrAmount(i.str))
      .sort((a, b) => a.x - b.x);
    if (nums.length >= 4) declared = { out: parseIdr(nums[1]!.str), in: parseIdr(nums[2]!.str) };
  }

  const rows: StatementRow[] = [];
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const onPage = items.filter((i) => i.page === page);
    const header = onPage.find((i) => i.str === 'TANGGAL');
    if (!header) continue;
    // Tepi kanan kolom angka dari judul "(IDR)" di baris judul tabel
    const idr = onPage
      .filter((i) => i.str === '(IDR)' && Math.abs(i.y - header.y) < 3)
      .sort((a, b) => a.x - b.x)
      .map((i) => i.x + i.w);
    if (idr.length < 3) continue;
    const [outEdge, inEdge, balanceEdge] = idr as [number, number, number];

    const table = onPage.filter((i) => i.y < header.y - 5 && i.y > 60);
    const anchors = table
      .filter((i) => i.x < 100 && /^\d{2} [A-Z]{3}$/.test(i.str))
      .sort((a, b) => b.y - a.y);

    for (const anchor of anchors) {
      // Teks baris = yang paling dekat ke tanggal ini (baris berjarak ~45 pt)
      const mine = table.filter(
        (i) =>
          i !== anchor &&
          !anchors.some((a) => a !== anchor && Math.abs(a.y - i.y) < Math.abs(anchor.y - i.y)) &&
          Math.abs(anchor.y - i.y) < 30,
      );
      const amounts = mine.filter((i) => isIdrAmount(i.str) && i.x > 200);
      const nearest = (edge: number) =>
        amounts.find((a) => {
          const right = a.x + a.w;
          const dists = [outEdge, inEdge, balanceEdge].map((e) => Math.abs(e - right));
          return Math.abs(edge - right) === Math.min(...dists);
        });
      const outItem = nearest(outEdge);
      const inItem = nearest(inEdge);
      const balanceItem = nearest(balanceEdge);
      const amountItem = outItem ?? inItem;
      if (!amountItem) continue;

      const lines = mine
        .filter((i) => i.x >= 100 && i.x < outEdge - 60 && !isIdrAmount(i.str))
        .sort((a, b) => b.y - a.y)
        .map((i) => i.str.replace(/\s+-$/, '').trim())
        .filter(Boolean);

      const [, dd, mon] = anchor.str.match(/^(\d{2}) ([A-Z]{3})$/)!;
      const month = monthOf(mon!)!;
      // Tahun dari periode; bulan lebih kecil dari bulan awal = tahun berikutnya
      let year = start?.y ?? end?.y ?? new Date().getFullYear();
      if (start && end && start.y !== end.y && month < start.m) year = end.y;

      rows.push({
        row: rows.length + 1,
        date: ymd(year, month, Number(dd)),
        time: null,
        amount: Math.round(parseIdr(amountItem.str)),
        direction: outItem ? 'out' : 'in',
        // Baris "Pengembalian Dana -" didahulukan: pihak lawannya baris kedua
        counterparty: /^Pengembalian Dana$/i.test(lines[0] ?? '')
          ? (lines[1] ?? '')
          : (lines[0] ?? ''),
        description: /^Pengembalian Dana$/i.test(lines[0] ?? '')
          ? 'Pengembalian Dana'
          : lines.slice(1).join(' '),
        balance: balanceItem ? Math.round(parseIdr(balanceItem.str)) : null,
      });
    }
  }

  return {
    bank: 'seabank',
    holder,
    accountNumber,
    period:
      start && end ? { from: ymd(start.y, start.m, start.d), to: ymd(end.y, end.m, end.d) } : null,
    rows,
    declared,
  };
}
