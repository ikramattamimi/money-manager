/**
 * Status bar judul ringkas (CompactTopBar). PageHeader menulis judul dan angka
 * ringkas halaman, serta `visible` saat pita gradiennya tergulir keluar layar.
 */
export function useCompactHeader() {
  return {
    title: useState('compact:title', () => ''),
    summary: useState('compact:summary', () => ''),
    visible: useState('compact:visible', () => false),
  };
}
