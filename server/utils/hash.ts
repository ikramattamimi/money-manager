/** SHA-256 heksadesimal 40 karakter (20 byte pertama), untuk dedupe_key */
export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .slice(0, 20)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
