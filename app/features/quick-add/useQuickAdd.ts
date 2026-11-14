/**
 * Permintaan membuka Ketik cepat di kartu Catat (iPad landscape, desktop).
 * Bertambah setiap tombol "Catat transaksi", pintasan N, atau /add?text=…;
 * TxCard mendengarnya lalu membuka dan memfokuskan Ketik cepat.
 */
export function useQuickAddUi() {
  const focusTick = useState('qa:focus', () => 0);
  return { focusTick };
}
