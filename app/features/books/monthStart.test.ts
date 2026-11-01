import { describe, expect, it } from 'vitest';
import { monthStartCaption } from './monthStart';

describe('monthStartCaption', () => {
  it('tanggal 1 = bulan kalender', () => {
    expect(monthStartCaption(1)).toBe('Bulan mengikuti kalender, tanggal 1 sampai akhir bulan');
  });

  it('tanggal 25: periode berjalan mulai bulan sebelumnya', () => {
    // 10 Okt 2026 masih di periode Okt = 25 Sep – 24 Okt
    const today = new Date('2026-10-10T05:00:00Z');
    expect(monthStartCaption(25, false, today)).toBe('Periode Okt = 25 Sep – 24 Okt');
    expect(monthStartCaption(25, true, today)).toBe(
      'Periode Okt = 25 Sep – 24 Okt, Nov = 25 Okt – 24 Nov',
    );
  });
});
