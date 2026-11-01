import { describe, expect, it } from 'vitest';
import { isTabRoot, navTransition } from './navigation';

const page = (path: string, modal = false) => ({ path, modal });

describe('isTabRoot', () => {
  it('mengenali halaman utama tab di app dan prototipe', () => {
    expect(isTabRoot('/')).toBe(true);
    expect(isTabRoot('/stats')).toBe(true);
    expect(isTabRoot('/accounts/')).toBe(true);
    expect(isTabRoot('/prototype')).toBe(true);
    expect(isTabRoot('/prototype/more')).toBe(true);
  });

  it('halaman rincian bukan tab utama', () => {
    expect(isTabRoot('/accounts/abc')).toBe(false);
    expect(isTabRoot('/settings/import')).toBe(false);
  });
});

describe('navTransition', () => {
  it('pindah tab tanpa animasi', () => {
    expect(navTransition(page('/'), page('/accounts'), false)).toBeNull();
  });

  it('tab → rincian = push, kembali = pop', () => {
    expect(navTransition(page('/accounts'), page('/accounts/abc'), false)).toBe('push');
    expect(navTransition(page('/accounts/abc'), page('/accounts'), true)).toBe('pop');
  });

  it('rincian → rincian lebih dalam = push, mundur = pop', () => {
    expect(navTransition(page('/settings/import'), page('/settings/import/bank'), false)).toBe(
      'push',
    );
    expect(navTransition(page('/settings/import/bank'), page('/settings/import'), true)).toBe(
      'pop',
    );
  });

  it('maju ke tab utama dari rincian terasa seperti kembali', () => {
    expect(navTransition(page('/settings/import'), page('/'), false)).toBe('pop');
  });

  it('form masuk dari bawah dan keluar ke bawah', () => {
    expect(navTransition(page('/'), page('/transaction', true), false)).toBe('modal-in');
    expect(navTransition(page('/transaction', true), page('/'), true)).toBe('modal-out');
    expect(navTransition(page('/accounts/new', true), page('/accounts/abc/edit', true), false)).toBe(
      'swap-modal',
    );
  });

  it('rute yang sama tanpa animasi', () => {
    expect(navTransition(page('/'), page('/'), false)).toBeNull();
  });
});
