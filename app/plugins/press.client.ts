// iOS Safari baru menyalakan :active (umpan balik tekan) kalau ada pendengar
// touchstart di dokumen. Pasif, jadi tidak menahan gulir.
export default defineNuxtPlugin(() => {
  document.addEventListener('touchstart', () => {}, { passive: true });
});
