-- Fase 6 T2: saran kategori, akun, dan nominal dari riwayat buku sendiri.
-- Mencari transaksi dengan catatan mirip (trigram), lalu memilih yang paling
-- sering dengan bobot: kemiripan × kebaruan (transaksi 90 hari lalu berbobot ½).
-- Memakai indeks trigram transactions_note_trgm_idx dari baseline (trigram
-- sudah tidak peka huruf besar/kecil).

create function public.suggest_from_note(p_book_id uuid, p_note text)
returns table (
  category_id uuid,
  type public.transaction_type,
  account_id uuid,
  amount bigint,
  matches integer
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select trim(p_note) as note
  ),
  hits as (
    select
      t.category_id,
      t.type,
      t.account_id,
      t.amount,
      greatest(similarity(t.note, q.note), word_similarity(q.note, t.note))
        / (1 + extract(epoch from (now() - t.occurred_at)) / 86400 / 90) as weight
    from public.transactions t, q
    where t.book_id = p_book_id
      and t.type <> 'transfer'
      and not t.is_adjustment
      and t.note <> ''
      and length(q.note) >= 3
      and (t.note % q.note or q.note <% t.note)
    order by t.occurred_at desc
    limit 500
  ),
  best_category as (
    select h.category_id, h.type from hits h
    where h.category_id is not null
    group by h.category_id, h.type
    order by sum(h.weight) desc
    limit 1
  ),
  best_account as (
    select h.account_id from hits h
    group by h.account_id
    order by sum(h.weight) desc
    limit 1
  ),
  -- Nominal hanya disarankan kalau muncul berulang (mis. langganan, parkir)
  best_amount as (
    select h.amount from hits h
    group by h.amount
    having count(*) >= 2
    order by sum(h.weight) desc
    limit 1
  )
  select
    (select category_id from best_category),
    (select type from best_category),
    (select account_id from best_account),
    (select amount from best_amount),
    (select count(*)::integer from hits)
  where exists (select 1 from hits);
$$;

revoke all on function public.suggest_from_note(uuid, text) from public, anon;
grant execute on function public.suggest_from_note(uuid, text) to authenticated;
