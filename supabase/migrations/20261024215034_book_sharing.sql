-- Fase 9: berbagi buku. Fungsi publik SECURITY INVOKER; bagian yang perlu
-- membaca auth.users atau undangan orang lain ada di helper private
-- SECURITY DEFINER yang sempit (pola sama dengan book_has_member_email).

-- ------------------------------------------------------------
-- Email anggota: hanya untuk pemilik buku, atau email dirinya sendiri.
-- Viewer/editor tidak melihat email anggota lain.
-- ------------------------------------------------------------
create function private.member_email(p_book_id uuid, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from auth.users u
  where u.id = p_user_id
    and (p_user_id = (select auth.uid()) or private.is_book_owner(p_book_id))
    and exists (select 1 from public.book_members m where m.book_id = p_book_id and m.user_id = p_user_id);
$$;
revoke all on function private.member_email(uuid, uuid) from public, anon;
grant execute on function private.member_email(uuid, uuid) to authenticated;

create function public.book_member_list(p_book_id uuid)
returns table (
  user_id uuid,
  role public.book_role,
  display_name text,
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
    private.member_email(p_book_id, m.user_id),
    m.user_id = (select auth.uid()),
    m.created_at
  from public.book_members m
  left join public.profiles p on p.id = m.user_id
  where m.book_id = p_book_id
  order by case m.role when 'owner' then 0 when 'editor' then 1 else 2 end, m.created_at;
$$;

-- ------------------------------------------------------------
-- Pratinjau undangan untuk halaman /invite/[token]: penerima belum anggota,
-- jadi belum bisa membaca undangan lewat RLS. Email tujuan hanya ditampilkan
-- tersamar, kecuali sama dengan email yang sedang login.
-- ------------------------------------------------------------
create function private.invite_preview(p_token text)
returns table (
  book_name text,
  role public.book_role,
  invited_by_name text,
  email_hint text,
  for_me boolean,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.name,
    i.role,
    coalesce(nullif(p.display_name, ''), 'Pemilik buku'),
    case
      when i.email = lower((select auth.jwt() ->> 'email')) then i.email
      else left(split_part(i.email, '@', 1), 2) || '•••@' || split_part(i.email, '@', 2)
    end,
    i.email = lower((select auth.jwt() ->> 'email')),
    case
      when i.accepted_at is not null then 'accepted'
      when i.expires_at < now() then 'expired'
      else 'open'
    end
  from public.book_invites i
  join public.books b on b.id = i.book_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = p_token
    and (select auth.uid()) is not null;
$$;
revoke all on function private.invite_preview(text) from public, anon;
grant execute on function private.invite_preview(text) to authenticated;

create function public.invite_preview(p_token text)
returns table (
  book_name text,
  role public.book_role,
  invited_by_name text,
  email_hint text,
  for_me boolean,
  status text
)
language sql
stable
security invoker
set search_path = public
as $$
  select * from private.invite_preview(p_token);
$$;

revoke all on function public.book_member_list(uuid) from public, anon;
revoke all on function public.invite_preview(text) from public, anon;
grant execute on function public.book_member_list(uuid) to authenticated;
grant execute on function public.invite_preview(text) to authenticated;
