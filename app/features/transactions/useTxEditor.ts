import type { Draft } from '@/features/quick-add/types';
import type { Transaction } from './api';

/** Halaman form penuh untuk HP */
export const TX_PAGE = '/transaction';

/**
 * Form lengkap tambah/edit transaksi.
 * `transaction` terisi = mode edit; `draft` = tambah baru dari isian panel cepat.
 * HP (< md): pindah ke halaman `/transaction`. iPad/desktop: dialog
 * (TransactionEditor di layout app).
 */
export function useTxEditor() {
  const router = useRouter();
  const { openAsPage, closePage } = useFormPage();
  const open = useState('editor:open', () => false);
  const transaction = useState<Transaction | null>('editor:tx', () => null);
  const draft = useState<Draft | null>('editor:draft', () => null);
  /** Bertambah setiap form dibuka: form dibuat ulang dengan isian segar */
  const session = useState('editor:session', () => 0);
  /** Kartu Catat desktop sedang tampil: tambah/ubah diisi di kartu, bukan dialog */
  const docked = useState('editor:docked', () => false);

  function show() {
    session.value++;
    if (docked.value) return;
    if (!openAsPage(TX_PAGE)) open.value = true;
  }

  function edit(tx: Transaction) {
    transaction.value = tx;
    draft.value = null;
    show();
  }

  function create(from: Draft | null = null) {
    transaction.value = null;
    draft.value = from;
    show();
  }

  function close() {
    open.value = false;
    if (docked.value) {
      // Kartu kembali ke Catat baru
      transaction.value = null;
      draft.value = null;
      session.value++;
    }
    if (router.currentRoute.value.path === TX_PAGE) closePage('/');
  }

  return { open, transaction, draft, session, docked, edit, create, close };
}
