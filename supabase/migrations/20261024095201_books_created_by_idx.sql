-- Dipakai policy select books (pembuat buku) dan foreign key ke auth.users.
create index books_created_by_idx on public.books (created_by);
