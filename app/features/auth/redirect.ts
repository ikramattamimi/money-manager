/** Hanya terima path internal, supaya ?next= tidak bisa dipakai mengarahkan ke situs lain. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.startsWith('/\\')
    ? next
    : '/';
}
