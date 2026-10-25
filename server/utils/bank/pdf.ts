import { getDocumentProxy } from 'unpdf';

/** Potongan teks PDF dengan posisinya (titik PDF, y dari bawah halaman) */
export interface PdfItem {
  page: number;
  x: number;
  y: number;
  /** Lebar teks; x + w = tepi kanan (angka rata kanan) */
  w: number;
  str: string;
}

/** Ambil semua teks PDF beserta posisi, untuk parser per bank */
export async function extractPdfItems(data: Uint8Array): Promise<PdfItem[]> {
  const pdf = await getDocumentProxy(data);
  const items: PdfItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      items.push({
        page: p,
        x: Math.round(item.transform[4] * 10) / 10,
        y: Math.round(item.transform[5] * 10) / 10,
        w: Math.round(item.width * 10) / 10,
        str: item.str.trim(),
      });
    }
  }
  return items;
}

/** "1.234.567" / "-58.700" / "+1.000.000" / "14.865,49" → angka (desimal dipertahankan) */
export function parseIdr(raw: string): number {
  const clean = raw.replace(/[^\d.,]/g, '');
  const [whole, fraction] = clean.split(',');
  return Number(`${(whole ?? '').replace(/\./g, '')}.${fraction ?? '0'}`);
}

export const isIdrAmount = (s: string) => /^[+-]?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s);

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  mei: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  agu: 8,
  agt: 8,
  sep: 9,
  oct: 10,
  okt: 10,
  nov: 11,
  dec: 12,
  des: 12,
};

/** "OCT" / "Okt" → 10 */
export function monthOf(name: string): number | null {
  return MONTHS[name.slice(0, 3).toLowerCase()] ?? null;
}

export const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
