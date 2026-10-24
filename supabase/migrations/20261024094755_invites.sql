-- ============================================================
-- Undangan ke buku.
--
-- create_invite: hanya owner (ditegakkan RLS insert book_invites).
-- accept_invite: SECURITY DEFINER karena penerima belum jadi anggota,
-- jadi belum bisa membaca undangan maupun menulis book_members.
-- Penerima harus login dengan email yang sama dengan undangan.
-- ============================================================

-- Email anggota ada di auth.users yang tidak bisa dibaca role authenticated.
create function private.book_has_member_email(p_book_id uuid, p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.book_members m
    join auth.users u on u.id = m.user_id
    where m.book_id = p_book_id and lower(u.email) = lower(p_email)
  );
$$;

revoke all on function private.book_has_member_email(uuid, text) from public, anon;
grant execute on function private.book_has_member_email(uuid, text) to authenticated;

create function public.create_invite(
  p_book_id uuid,
  p_email text,
  p_role public.book_role default 'editor'
)
returns public.book_invites
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_invite public.book_invites;
begin
  if p_role = 'owner' then
    raise exception 'Undangan hanya untuk peran editor atau viewer' using errcode = '22023';
  end if;
  if v_email = lower((select auth.jwt() ->> 'email')) then
    raise exception 'Tidak bisa mengundang diri sendiri' using errcode = '22023';
  end if;
  if not private.is_book_owner(p_book_id) then
    raise exception 'Hanya pemilik buku yang bisa mengundang' using errcode = '42501';
  end if;
  if private.book_has_member_email(p_book_id, v_email) then
    raise exception '% sudah jadi anggota buku ini', v_email using errcode = '23505';
  end if;

  -- Undangan lama yang belum diterima untuk email yang sama diganti
  delete from public.book_invites
  where book_id = p_book_id and email = v_email and accepted_at is null;

  insert into public.book_invites (book_id, email, role)
  values (p_book_id, v_email, p_role)
  returning * into v_invite;

  return v_invite;
end;
$$;

create function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower((select auth.jwt() ->> 'email'));
  v_invite public.book_invites;
begin
  if v_uid is null then
    raise exception 'Masuk dulu untuk menerima undangan' using errcode = '42501';
  end if;

  select * into v_invite
  from public.book_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'Undangan tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Undangan ini sudah dipakai' using errcode = 'P0001';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Undangan sudah kedaluwarsa. Minta pemilik buku mengirim ulang.'
      using errcode = 'P0001';
  end if;
  if v_invite.email <> v_email then
    raise exception 'Undangan ini untuk %. Masuk dengan email itu untuk menerimanya.',
      v_invite.email using errcode = '42501';
  end if;

  insert into public.book_members (book_id, user_id, role)
  values (v_invite.book_id, v_uid, v_invite.role)
  on conflict (book_id, user_id) do nothing;

  update public.book_invites
  set accepted_at = now(), accepted_by = v_uid
  where id = v_invite.id;

  return v_invite.book_id;
end;
$$;

revoke all on function public.create_invite(uuid, text, public.book_role) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.create_invite(uuid, text, public.book_role) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
