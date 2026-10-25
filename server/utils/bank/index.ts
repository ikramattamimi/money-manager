import type { ParsedStatement } from '#shared/types/bank';
import { isJago, parseJago } from './jago';
import type { PdfItem } from './pdf';
import { isSeabank, parseSeabank } from './seabank';

/** Bank yang didukung, dideteksi otomatis dari isi file */
const PARSERS = [
  { detect: isSeabank, parse: parseSeabank },
  { detect: isJago, parse: parseJago },
];

/** null = format belum dikenali */
export function parseStatement(items: PdfItem[]): ParsedStatement | null {
  const parser = PARSERS.find((p) => p.detect(items));
  return parser ? parser.parse(items) : null;
}
