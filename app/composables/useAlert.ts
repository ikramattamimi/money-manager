export interface AlertRequest {
  title: string;
  body?: string;
  /** Label tombol aksi (mis. "Batalkan impor") */
  okLabel: string;
  /** Aksi merusak: tombol merah tebal */
  danger?: boolean;
}

interface AlertState extends AlertRequest {
  id: number;
  resolve: (ok: boolean) => void;
}

let nextId = 1;

/**
 * Dialog peringatan iOS untuk aksi yang tidak bisa diurungkan (hapus akun,
 * batalkan impor, hapus buku). Aksi yang bisa dibatalkan memakai toast
 * Urungkan, bukan dialog ini. Dipasang sekali lewat <IosAlert /> di AppShell.
 */
export function useAlert() {
  const current = useState<AlertState | null>('alert:current', () => null);

  function confirm(request: AlertRequest): Promise<boolean> {
    current.value?.resolve(false);
    return new Promise((resolve) => {
      current.value = { ...request, id: nextId++, resolve };
    });
  }

  function answer(ok: boolean) {
    const alert = current.value;
    current.value = null;
    alert?.resolve(ok);
  }

  return { current, confirm, answer };
}
