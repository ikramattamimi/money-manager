import { describe, expect, it } from 'vitest';
import { evaluate, expressionLabel, keyFromKeyboard, press, type CalcKey } from './calculator';

const type = (keys: CalcKey[], start: string[] = []) => keys.reduce(press, start);

describe('press', () => {
  it('menyusun angka dan memakai 000 untuk ribuan', () => {
    expect(type(['2', '5', '000'])).toEqual(['25000']);
  });

  it('angka baru tidak diawali 00/000, nol di depan dibuang', () => {
    expect(type(['000'])).toEqual([]);
    expect(type(['0', '7'])).toEqual(['7']);
  });

  it('operator berturut-turut mengganti operator sebelumnya, tidak bisa di awal', () => {
    expect(type(['+'])).toEqual([]);
    expect(type(['5', '+', '×'])).toEqual(['5', '×']);
  });

  it('hapus satu: angka per digit, operator utuh', () => {
    expect(type(['1', '2', '+', 'del'])).toEqual(['12']);
    expect(type(['1', '2', 'del'])).toEqual(['1']);
    expect(type(['1', 'del', 'del'])).toEqual([]);
  });

  it('= menghitung kalau ada operator, kalau tidak token tetap (Lanjut)', () => {
    expect(type(['2', '5', '000', '+', '1', '2', '5', '00', '='])).toEqual(['37500']);
    expect(type(['9', '='])).toEqual(['9']);
  });

  it('hasil nol atau negatif mengosongkan', () => {
    expect(type(['5', '−', '9', '='])).toEqual([]);
  });

  it('batas 12 digit per angka', () => {
    const t = type(['1', '000', '000', '000', '000']);
    expect(t).toEqual(['1000000000']);
    expect(press(['123456789012'], '3')).toEqual(['123456789012']);
  });
});

describe('evaluate', () => {
  it('× dan ÷ lebih dulu dari + dan −, dibulatkan', () => {
    expect(evaluate(['1000', '+', '2', '×', '300'])).toBe(1600);
    expect(evaluate(['100000', '÷', '3'])).toBe(33333);
    expect(evaluate(['10', '−', '4', '−', '1'])).toBe(5);
  });

  it('operator di ujung diabaikan, bagi nol = 0', () => {
    expect(evaluate(['50', '+'])).toBe(50);
    expect(evaluate(['50', '÷', '0'])).toBe(0);
    expect(evaluate([])).toBe(0);
  });
});

describe('label dan keyboard', () => {
  it('ekspresi hanya tampil kalau ada operator', () => {
    expect(expressionLabel(['25000', '+', '12500'])).toBe('25.000 + 12.500');
    expect(expressionLabel(['25000'])).toBe('');
  });

  it('memetakan tombol keyboard fisik', () => {
    expect(keyFromKeyboard('7')).toBe('7');
    expect(keyFromKeyboard('*')).toBe('×');
    expect(keyFromKeyboard('-')).toBe('−');
    expect(keyFromKeyboard('Backspace')).toBe('del');
    expect(keyFromKeyboard('a')).toBeNull();
  });
});
