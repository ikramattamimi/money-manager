export interface ToastItem {
  id: number;
  text: string;
  undo?: () => void;
}

const DURATION_MS = 4000;
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 1;

/**
 * Satu toast pada satu waktu (pengganti yang baru langsung menimpa).
 * Aksi yang bisa dibatalkan memakai toast "Urungkan", bukan dialog konfirmasi.
 * Timer berhenti saat tab disembunyikan, supaya toast tidak hilang tanpa terbaca.
 */
export function useToast() {
  const current = useState<ToastItem | null>('toast:current', () => null);

  function dismiss() {
    clearTimeout(timer);
    current.value = null;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(dismiss, DURATION_MS);
  }

  function show(text: string, undo?: () => void) {
    current.value = { id: nextId++, text, undo };
    schedule();
  }

  function runUndo() {
    current.value?.undo?.();
    dismiss();
  }

  return { current, show, dismiss, runUndo, schedule, pause: () => clearTimeout(timer) };
}
