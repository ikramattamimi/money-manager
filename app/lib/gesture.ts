// Aturan gestur (emil-design-eng): flick cukup untuk menutup, gesekan di batas.

/** Kecepatan minimal (px/ms) yang dianggap flick, berapa pun jaraknya */
export const FLICK_VELOCITY = 0.11;

/**
 * Lepas gestur: lanjutkan aksi (tutup/hapus) kalau sudah melewati porsi ukuran
 * elemen, atau kalau dilempar cukup cepat dan sudah bergerak sedikit.
 */
export function shouldCommit(
  distance: number,
  size: number,
  elapsedMs: number,
  { ratio, minFlick }: { ratio: number; minFlick: number },
): boolean {
  if (distance <= 0) return false;
  const velocity = distance / Math.max(elapsedMs, 1);
  return distance > size * ratio || (velocity > FLICK_VELOCITY && distance > minFlick);
}

/** Gesekan linear: elemen bergerak sebagian kecil dari jarak jari */
export function linearFriction(delta: number, factor = 0.15): number {
  return delta * factor;
}

/** Gesekan yang makin berat: makin jauh ditarik, makin sedikit bergerak */
export function sqrtFriction(delta: number, factor = 3): number {
  return Math.sign(delta) * Math.sqrt(Math.abs(delta)) * factor;
}
