import { describe, expect, it } from 'vitest';
import { linearFriction, shouldCommit, sqrtFriction } from './gesture';

const SHEET = { ratio: 0.3, minFlick: 24 };

describe('shouldCommit', () => {
  it('menutup kalau ditarik melewati 30% tinggi', () => {
    expect(shouldCommit(200, 600, 2000, SHEET)).toBe(true);
    expect(shouldCommit(150, 600, 2000, SHEET)).toBe(false);
  });

  it('menutup kalau di-flick walau jaraknya pendek', () => {
    expect(shouldCommit(40, 600, 100, SHEET)).toBe(true); // 0,4 px/ms
  });

  it('tidak menutup karena getaran kecil yang cepat', () => {
    expect(shouldCommit(10, 600, 20, SHEET)).toBe(false);
  });

  it('tidak pernah menutup kalau arah gerak berlawanan', () => {
    expect(shouldCommit(-300, 600, 50, SHEET)).toBe(false);
  });
});

describe('friction', () => {
  it('linear memperkecil gerak', () => {
    expect(linearFriction(100)).toBe(15);
  });

  it('akar makin berat untuk tarikan jauh dan menjaga arah', () => {
    expect(sqrtFriction(-100)).toBe(-30);
    expect(sqrtFriction(400)).toBe(60);
  });
});
