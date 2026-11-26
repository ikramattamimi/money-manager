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

  function show() {
    session.value++;
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
    if (router.currentRoute.value.path === TX_PAGE) closePage('/');
  }

  return { open, transaction, draft, session, edit, create, close };
}
