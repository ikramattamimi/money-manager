import { describe, expect, it } from 'vitest';
import {
  createVelocityTracker,
  linearFriction,
  project,
  rubber,
  shouldCommit,
  sqrtFriction,
} from './gesture';

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

describe('project', () => {
  it('lemparan 1000 px/s berhenti ~499px lebih jauh (laju 0,998)', () => {
    expect(project(1000)).toBeCloseTo(499, 0);
  });

  it('diam tidak bergerak, arah ikut tanda kecepatan', () => {
    expect(project(0)).toBe(0);
    expect(project(-500)).toBeCloseTo(-249.5, 1);
  });
});

describe('rubber', () => {
  it('makin berat dan tidak pernah melewati ukuran elemen', () => {
    const near = rubber(50, 400);
    const far = rubber(400, 400);
    expect(near).toBeLessThan(50);
    expect(far / 400).toBeLessThan(near / 50);
    expect(rubber(100_000, 400)).toBeLessThan(400);
  });

  it('menjaga arah', () => {
    expect(rubber(-80, 400)).toBeCloseTo(-rubber(80, 400));
  });
});

describe('createVelocityTracker', () => {
  it('menghitung px/ms dari sampel ~100ms terakhir', () => {
    const v = createVelocityTracker();
    v.reset(0, 0);
    v.add(100, 50);
    v.add(300, 150);
    v.add(500, 200);
    expect(v.velocity()).toBeCloseTo(4, 5); // sampel awal dibuang: (500-300)/(200-150)
  });

  it('nol kalau hanya satu sampel', () => {
    const v = createVelocityTracker();
    v.reset(10, 0);
    expect(v.velocity()).toBe(0);
  });
});
