/**
 * Kecilkan foto sebelum dikirim ke server: sisi terpanjang maksimal `maxSide`
 * px, disimpan ulang sebagai JPEG. Foto HP 12 MP (~4 MB) jadi ~300 KB, cukup
 * jelas untuk dibaca dan jauh lebih murah dikirim ke AI. Kalau browser tidak
 * bisa membaca gambarnya, file asli dikembalikan apa adanya.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Latar putih untuk PNG transparan (screenshot) supaya teks tetap terbaca
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, '') || 'foto';
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
}
