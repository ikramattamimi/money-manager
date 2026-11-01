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

/**
 * Proyeksi momentum (apple-design, sampel Designing Fluid Interfaces): ke mana
 * gestur akan berhenti kalau dibiarkan melambat seperti gulir iOS.
 * `velocity` dalam px/detik, hasil dalam px.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Rubber-band iOS: jarak tampil untuk tarikan `overshoot` melewati batas.
 * Makin jauh ditarik makin berat, tidak pernah melewati `dimension`.
 */
export function rubber(overshoot: number, dimension: number, constant = 0.55): number {
  const sign = Math.sign(overshoot);
  const x = Math.abs(overshoot);
  return (sign * (x * dimension * constant)) / (dimension + constant * x);
}

/** Pencatat kecepatan dari ~100ms gerakan terakhir (px/ms) */
export function createVelocityTracker() {
  let samples: { v: number; t: number }[] = [];
  return {
    reset(value: number, time = performance.now()) {
      samples = [{ v: value, t: time }];
    },
    add(value: number, time = performance.now()) {
      samples.push({ v: value, t: time });
      while (samples.length > 2 && time - samples[0]!.t > 100) samples.shift();
    },
    velocity(): number {
      const a = samples[0];
      const b = samples[samples.length - 1];
      if (!a || !b || b.t <= a.t) return 0;
      return (b.v - a.v) / (b.t - a.t);
    },
  };
}
