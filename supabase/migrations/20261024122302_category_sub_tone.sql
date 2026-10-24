-- Subkategori memakai warna induknya (sama dengan seed_book_defaults),
-- supaya kategori yang sama terlihat sekelompok di daftar dan grafik.
update public.categories c
set tone = p.tone
from public.categories p
where c.parent_id = p.id and c.tone <> p.tone;
