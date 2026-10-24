import { useMutation } from '@tanstack/vue-query';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useActiveBook } from '@/features/books/useActiveBook';
import { useCategories } from '@/features/categories/useCategories';
import { exportApi } from './api';
import { toRealbyteRows } from './realbyteRows';

/** Ekspor transaksi rentang tertentu ke .xlsx gaya Realbyte, langsung diunduh */
export function useExportExcel() {
  const { bookId } = useActiveBook();
  const accounts = useAccounts();
  const categories = useCategories();

  const withEmoji = (id: string) => {
    const c = categories.byId.value.get(id);
    return c ? `${c.emoji} ${c.name}`.trim() : '';
  };

  return useMutation({
    mutationFn: async ({
      from,
      to,
      filename,
    }: {
      from: string | null;
      to: string | null;
      filename: string;
    }) => {
      const list = await exportApi.transactions(bookId.value!, from, to);
      if (!list.length) throw new Error('Tidak ada transaksi di rentang ini.');

      const rows = toRealbyteRows(list, {
        account: (id) => accounts.name(id),
        category: (id) => {
          const c = id ? categories.byId.value.get(id) : undefined;
          if (!c) return { parent: '', child: '' };
          return c.parent_id
            ? { parent: withEmoji(c.parent_id), child: withEmoji(c.id) }
            : { parent: withEmoji(c.id), child: '' };
        },
      });

      // SheetJS hanya dimuat saat ekspor, tidak ikut bundel awal
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      // Kolom Period ditampilkan sebagai tanggal-jam di Excel
      for (let r = 1; r < rows.length; r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
        if (cell) cell.z = 'yyyy-mm-dd hh:mm:ss';
      }
      sheet['!cols'] = [
        { wch: 19 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 24 },
        { wch: 12 },
      ];
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
      XLSX.writeFile(book, filename, { compression: true });
      return list.length;
    },
  });
}
