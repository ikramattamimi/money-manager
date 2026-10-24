-- Fase 6 T4: hitung pemakaian template (untuk urutan "paling sering dipakai").
-- SECURITY INVOKER: hanya owner/editor buku yang bisa (RLS update templates).
create function public.bump_template(p_template_id uuid)
returns integer
language sql
security invoker
set search_path = public
as $$
  update public.templates set use_count = use_count + 1
  where id = p_template_id
  returning use_count;
$$;

revoke all on function public.bump_template(uuid) from public, anon;
grant execute on function public.bump_template(uuid) to authenticated;
