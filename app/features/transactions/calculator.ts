/*
 * Papan angka dengan kalkulator (mockup press/evalT): nominal diketik sebagai
 * deretan token angka dan operator, mis. ["25000", "+", "12500"]. × dan ÷
 * dihitung lebih dulu dari + dan −; hasil dibulatkan ke rupiah. Fungsi murni.
 */

export const OPS = ['+', '−', '×', '÷'] as const;
export type Op = (typeof OPS)[number];
export type CalcKey = Op | '=' | 'del' | 'C' | '0' | '00' | '000' | `${number}`;

/** Panjang maksimal satu angka (sampai ratusan miliar) */
const MAX_DIGITS = 12;

const isOp = (t: string | undefined): t is Op => !!t && (OPS as readonly string[]).includes(t);

/** Nilai ekspresi; operator di ujung diabaikan. Bagi nol = 0. */
export function evaluate(tokens: readonly string[]): number {
  const t = isOp(tokens.at(-1)) ? tokens.slice(0, -1) : tokens.slice();
  if (!t.length) return 0;
  const terms = [Number(t[0])];
  const signs: ('+' | '−')[] = [];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i] as Op;
    const n = Number(t[i + 1] ?? 0);
    const last = terms.length - 1;
    if (op === '×') terms[last]! *= n;
    else if (op === '÷') terms[last] = n ? terms[last]! / n : 0;
    else {
      signs.push(op);
      terms.push(n);
    }
  }
  let value = terms[0]!;
  signs.forEach((op, j) => (value = op === '+' ? value + terms[j + 1]! : value - terms[j + 1]!));
  return Math.round(value);
}

export const hasOperator = (tokens: readonly string[]) => tokens.some(isOp);

/** Token dari nominal yang sudah ada (mis. saat mengubah transaksi) */
export const fromAmount = (amount: number): string[] => (amount > 0 ? [String(amount)] : []);

/**
 * Tekan satu tombol. `=` menghitung kalau ada operator; kalau tidak, token tidak
 * berubah (pemanggil memakai `=` sebagai "Lanjut").
 */
export function press(tokens: readonly string[], key: CalcKey): string[] {
  const t = tokens.slice();
  const last = t.at(-1);
  if (/^\d+$/.test(key)) {
    if (!last || isOp(last)) {
      // Angka baru tidak boleh diawali 00 / 000
      if (/^0{2,}$/.test(key)) return t;
      t.push(key);
    } else {
      const next = last === '0' ? key.replace(/^0+/, '') || '0' : last + key;
      if (next.length > MAX_DIGITS) return t;
      t[t.length - 1] = next;
    }
  } else if (isOp(key)) {
    if (!last) return t;
    if (isOp(last)) t[t.length - 1] = key;
    else t.push(key);
  } else if (key === 'del') {
    if (!last) return t;
    if (isOp(last) || last.length === 1) t.pop();
    else t[t.length - 1] = last.slice(0, -1);
  } else if (key === 'C') {
    return [];
  } else if (key === '=') {
    if (!hasOperator(t)) return t;
    const result = evaluate(t);
    return result > 0 ? [String(result)] : [];
  }
  return t;
}

/** Ekspresi untuk ditampilkan di atas nominal: "25.000 + 12.500" (kosong kalau satu angka) */
export function expressionLabel(tokens: readonly string[]): string {
  if (!hasOperator(tokens)) return '';
  return tokens.map((x) => (isOp(x) ? ` ${x} ` : Number(x).toLocaleString('id-ID'))).join('');
}

/** Tombol keyboard fisik → tombol papan angka (desktop) */
export function keyFromKeyboard(key: string): CalcKey | null {
  if (/^\d$/.test(key)) return key as CalcKey;
  const map: Record<string, CalcKey> = {
    '+': '+',
    '-': '−',
    '*': '×',
    x: '×',
    '/': '÷',
    ':': '÷',
    '=': '=',
    Backspace: 'del',
    Delete: 'C',
    Escape: 'C',
  };
  return map[key] ?? null;
}
