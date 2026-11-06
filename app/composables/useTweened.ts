/**
 * Deretan angka yang meluncur ke nilai baru (ease-out ~280ms) saat sumbernya
 * berubah. Dipakai grafik supaya batang dan garis bergerak, bukan loncat.
 * Interupsi: nilai baru mulai dari posisi saat ini, bukan dari awal.
 * Reduce Motion atau jumlah titik berubah: langsung ke nilai baru.
 */
export function useTweened(source: () => number[], ms = 280) {
  const out = ref<number[]>(source());
  let raf = 0;
  watch(source, (to) => {
    if (!import.meta.client) {
      out.value = to;
      return;
    }
    cancelAnimationFrame(raf);
    const from = out.value;
    const same = from.length === to.length && from.every((v, i) => v === to[i]);
    if (same) return;
    if (from.length !== to.length || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      out.value = to;
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      out.value = to.map((v, i) => from[i]! + (v - from[i]!) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  onBeforeUnmount(() => import.meta.client && cancelAnimationFrame(raf));
  return out;
}
