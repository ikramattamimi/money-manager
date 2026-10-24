import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext', () => {
  it('menerima path internal', () => {
    expect(safeNext('/accounts')).toBe('/accounts');
    expect(safeNext('/stats?month=2026-10')).toBe('/stats?month=2026-10');
  });

  it('menolak URL luar dan nilai aneh', () => {
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext(['/a'])).toBe('/');
  });
});
