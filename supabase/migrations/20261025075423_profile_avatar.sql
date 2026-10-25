-- Profil: nama tampilan (sudah ada) dan foto profil.
-- Foto disimpan di bucket Storage publik `avatars` dengan nama acak di folder
-- milik user (avatars/<user_id>/<uuid>.jpg), jadi hanya bisa ditebak oleh yang
-- sudah tahu alamatnya. Hanya pemilik folder yang bisa menulis/menghapus.

alter table public.profiles add column avatar_url text
  check (avatar_url is null or length(avatar_url) <= 500);
alter table public.profiles
  add constraint profiles_display_name_length check (length(display_name) <= 60);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: unggah ke folder sendiri" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: ubah milik sendiri" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: hapus milik sendiri" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Daftar anggota buku ikut membawa foto profil
drop function public.book_member_list(uuid);
create function public.book_member_list(p_book_id uuid)
returns table (
  user_id uuid,
  role public.book_role,
  display_name text,
  avatar_url text,
  email text,
  is_me boolean,
  joined_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.user_id,
    m.role,
    coalesce(nullif(p.display_name, ''), 'Anggota'),
    p.avatar_url,
    private.member_email(p_book_id, m.user_id),
    m.user_id = (select auth.uid()),
    m.created_at
  from public.book_members m
  left join public.profiles p on p.id = m.user_id
  where m.book_id = p_book_id
  order by case m.role when 'owner' then 0 when 'editor' then 1 else 2 end, m.created_at;
$$;
revoke all on function public.book_member_list(uuid) from public, anon;
grant execute on function public.book_member_list(uuid) to authenticated;
