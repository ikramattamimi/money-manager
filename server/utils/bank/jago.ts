import type { ParsedStatement, StatementRow } from '#shared/types/bank';
import { isIdrAmount, monthOf, parseIdr, ymd, type PdfItem } from './pdf';

/**
 * Riwayat transaksi Kantong Bank Jago (PDF "Pockets Transactions History").
 * Kolom: Tanggal & Waktu | Sumber/Tujuan | Rincian Transaksi | Catatan |
 * Jumlah (bertanda + / -) | Saldo. Satu baris setinggi ~4 baris teks, dimulai
 * dari tanggal "01 Okt 2026" dengan jam "16.54" di bawahnya.
 */
export function isJago(items: PdfItem[]): boolean {
  return items.some((i) => /Pockets Transactions History/i.test(i.str) || /jago\.com/i.test(i.str));
}

/** Teks yang hanya berupa ID transaksi, tidak berguna sebagai catatan */
const isId = (s: string) =>
  /^ID#/.test(s) ||
  /ID-\d$/.test(s) ||
  /^[A-Za-z0-9]{14,}$/.test(s) ||
  /^\w{1,6}-\d$/.test(s) ||
  /^\d{8,}$/.test(s);

/** Judul dan nomor halaman yang tercetak di sela tabel */
const isChrome = (s: string) =>
  /^Pockets Transactions History$/i.test(s) || /^Halaman \d+ dari \d+$/i.test(s);

/** "004 - XL FlexMax 7GB" → "XL FlexMax 7GB"; "28 Hari -" → "28 Hari"; kode merchant umum dibuang */
const cleanNote = (s: string) =>
  /^\d{3} - .*Generic$/.test(s)
    ? ''
    : s
        .replace(/^\d{3} - /, '')
        .replace(/\s+-$/, '')
        .trim();

export function parseJago(items: PdfItem[]): ParsedStatement {
  const text = (re: RegExp) => items.find((i) => re.test(i.str))?.str ?? '';

  // "01 Okt 2026 - 31 Okt 2026"
  const pm = text(/^\d{2} \w{3} \d{4} - \d{2} \w{3} \d{4}$/).match(
    /(\d{2}) (\w{3}) (\d{4}) - (\d{2}) (\w{3}) (\d{4})/,
  );
  const period = pm
    ? {
        from: ymd(+pm[3]!, monthOf(pm[2]!)!, +pm[1]!),
        to: ymd(+pm[6]!, monthOf(pm[5]!)!, +pm[4]!),
      }
    : null;

  const firstPage = items.filter((i) => i.page === 1);
  const pocketLine = text(/^.+ \d{10,}$/);
  const accountNumber = pocketLine.match(/(\d{10,})$/)?.[1] ?? null;
  // Nama pemilik: baris di atas nama kantong
  const pocketItem = firstPage.find((i) => i.str === pocketLine);
  const holder =
    firstPage
      .filter((i) => pocketItem && Math.abs(i.x - pocketItem.x) < 5 && i.y > pocketItem.y)
      .sort((a, b) => a.y - b.y)[0]?.str ?? '';

  const rows: StatementRow[] = [];
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  // Baris yang terbelah halaman: potongan di dasar halaman sebelumnya disambung
  // ke baris pertama halaman berikutnya (yang tercetak di atas judul tabel)
  let carry: PdfItem[] = [];
  for (const page of pages) {
    const onPage = items.filter((i) => i.page === page && !isChrome(i.str));
    const col = (name: RegExp) => onPage.find((i) => name.test(i.str))?.x;
    const xSource = col(/^Sumber\/Tujuan$/);
    const xDetail = col(/^Rincian Transaksi$/);
    const xNote = col(/^Catatan$/);
    const xAmount = col(/^Jumlah$/);
    const xBalance = col(/^Saldo$/);
    const headerY = onPage.find((i) => /^Tanggal & Waktu$/.test(i.str))?.y;
    if ([xSource, xDetail, xNote, xAmount, xBalance, headerY].some((v) => v === undefined))
      continue;

    const anchors = onPage
      .filter((i) => i.x < xSource! - 20 && /^\d{2} \w{3} \d{4}$/.test(i.str))
      .sort((a, b) => b.y - a.y);
    const pageCarry = carry;
    carry = [];

    anchors.forEach((anchor, index) => {
      // Baris dimulai di tanggal dan turun sampai sebelum tanggal berikutnya (maks ~4 baris teks)
      const next = anchors[index + 1];
      const bottom = Math.max(next ? next.y + 5 : -Infinity, anchor.y - 125);
      const continued = index === 0 && anchor.y > headerY! ? pageCarry : [];
      const mine = [
        // Potongan halaman sebelumnya ditaruh tepat di atas baris ini, urutannya tetap
        ...continued.map((i) => ({ ...i, y: anchor.y + 1 + i.y / 1000 })),
        ...onPage.filter((i) => i.y <= anchor.y + 3 && i.y > bottom && i !== anchor),
      ];
      if (!next) carry = onPage.filter((i) => i.y <= bottom && i.y > 0);
      const inColumn = (from: number, to: number) =>
        mine
          .filter((i) => i.x >= from - 10 && i.x < to - 10)
          .sort((a, b) => b.y - a.y)
          .map((i) => i.str);

      const amountItem = mine.find(
        (i) =>
          i.x >= xNote! + 100 && i.x < xBalance! - 100 && /^[+-]/.test(i.str) && isIdrAmount(i.str),
      );
      if (!amountItem) return;
      const balanceItem = mine.find((i) => i.x >= xBalance! - 100 && isIdrAmount(i.str));
      const time = mine.find((i) => i.x < xSource! - 20 && /^\d{2}\.\d{2}$/.test(i.str))?.str;

      const source = inColumn(xSource!, xDetail!).filter((s) => !isId(s));
      const detail = inColumn(xDetail!, xNote!).filter((s) => !isId(s));
      // Catatan sering bertumpuk dengan teks Jumlah di baris yang sama ("auto sweep +200.000")
      const note = inColumn(xNote!, xAmount!)
        .filter((s) => !isId(s) && !isIdrAmount(s))
        .map(cleanNote)
        .filter(Boolean)
        .join(' ');

      const [, dd, mon, yyyy] = anchor.str.match(/^(\d{2}) (\w{3}) (\d{4})$/)!;
      rows.push({
        row: rows.length + 1,
        date: ymd(Number(yyyy), monthOf(mon!)!, Number(dd)),
        time: time ? time.replace('.', ':') : null,
        amount: Math.round(parseIdr(amountItem.str)),
        direction: amountItem.str.startsWith('-') ? 'out' : 'in',
        counterparty: source.join(' ').replace(/\s+/g, ' ').trim(),
        description: [...new Set([...detail, note].filter(Boolean))].join(' · '),
        balance: balanceItem ? parseIdr(balanceItem.str) : null,
      });
    });
  }

  return { bank: 'jago', holder, accountNumber, period, rows, declared: null };
}
