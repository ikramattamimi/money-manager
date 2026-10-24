-- ============================================================
-- Pembuat buku boleh membaca baris bukunya.
--
-- supabase-js .insert().select() memakai INSERT ... RETURNING, dan
-- RETURNING dicek policy SELECT sebelum trigger AFTER INSERT
-- (handle_new_book) sempat menjadikan pembuatnya owner. Tanpa ini,
-- membuat buku dari client selalu gagal dengan error RLS.
--
-- Efek samping: pembuat yang sudah menyerahkan kepemilikan lalu keluar
-- masih melihat baris buku itu (nama saja). Data di dalamnya tetap
-- tertutup karena tabel lain memakai is_book_member.
-- ============================================================

drop policy "books: anggota bisa membaca" on public.books;

create policy "books: anggota atau pembuat bisa membaca"
  on public.books for select to authenticated
  using (private.is_book_member(id) or created_by = (select auth.uid()));
