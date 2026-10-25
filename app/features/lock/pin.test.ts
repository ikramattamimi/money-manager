import { describe, expect, it } from 'vitest';
import { hashPin, isValidPin, randomSalt, sameHash, shouldLock } from './pin';

describe('PIN', () => {
  it('4–6 digit angka saja', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('hash tetap untuk PIN dan garam yang sama, beda untuk garam lain', async () => {
    const salt = randomSalt();
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    const a = await hashPin('2580', salt);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(sameHash(a, await hashPin('2580', salt))).toBe(true);
    expect(sameHash(a, await hashPin('2581', salt))).toBe(false);
    expect(sameHash(a, await hashPin('2580', randomSalt()))).toBe(false);
  });

  it('dikunci lagi setelah batas waktu di latar belakang', () => {
    const t = 1_000_000;
    expect(shouldLock(null, t, 5)).toBe(false);
    expect(shouldLock(t, t + 4 * 60_000, 5)).toBe(false);
    expect(shouldLock(t, t + 5 * 60_000, 5)).toBe(true);
    // 0 menit = setiap kali kembali ke app
    expect(shouldLock(t, t + 1, 0)).toBe(true);
  });
});
