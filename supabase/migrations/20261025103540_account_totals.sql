-- ============================================================
-- Total akun yang bisa diatur sendiri (mis. "Uang bulanan", "Investasi").
--
-- Menggantikan centang "Sertakan di total aset": tiap akun masuk ke satu total
-- atau tidak sama sekali (accounts.total_id). Satu total per buku bisa
-- ditandai `on_transactions`: saldonya tampil di halaman Transaksi dan
-- transaksi di sana disaring ke akun-akunnya.
--
-- accounts.include_in_total tetap ada dan diisi client = (total_id is not
-- null), supaya impor dan fungsi lama yang mengisinya tetap masuk akal.
-- ============================================================

create table public.account_totals (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  sort integer not null default 0,
  on_transactions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, book_id)
);
create index account_totals_book_id_idx on public.account_totals (book_id, sort);
-- Paling banyak satu total yang tampil di halaman Transaksi per buku
create unique index account_totals_one_on_transactions
  on public.account_totals (book_id) where on_transactions;

create trigger account_totals_updated_at before update on public.account_totals
  for each row execute function private.set_updated_at();

alter table public.account_totals enable row level security;
create policy "account_totals: anggota bisa membaca" on public.account_totals
  for select to authenticated using (private.is_book_member(book_id));
create policy "account_totals: owner/editor bisa menambah" on public.account_totals
  for insert to authenticated with check (private.can_edit_book(book_id));
create policy "account_totals: owner/editor bisa mengubah" on public.account_totals
  for update to authenticated
  using (private.can_edit_book(book_id)) with check (private.can_edit_book(book_id));
create policy "account_totals: owner/editor bisa menghapus" on public.account_totals
  for delete to authenticated using (private.can_edit_book(book_id));

-- Total dihapus = akunnya jadi tidak ikut total (book_id tetap)
alter table public.accounts
  add column total_id uuid,
  add foreign key (total_id, book_id)
    references public.account_totals (id, book_id) on delete set null (total_id);
create index accounts_total_id_idx on public.accounts (total_id, book_id);

-- Data lama: satu total "Total aset" per buku berisi akun yang ikut total
insert into public.account_totals (book_id, name, sort)
select distinct a.book_id, 'Total aset', 0
from public.accounts a
where a.include_in_total;

update public.accounts a
set total_id = t.id
from public.account_totals t
where t.book_id = a.book_id and a.include_in_total;

-- Akun baru dari impor (tanpa total_id) masuk ke total pertama buku itu
create function private.account_default_total()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.total_id is null and new.include_in_total then
    select t.id into new.total_id
    from public.account_totals t
    where t.book_id = new.book_id
    order by t.sort, t.created_at
    limit 1;
  end if;
  return new;
end;
$$;

create trigger accounts_default_total before insert on public.accounts
  for each row execute function private.account_default_total();

-- ------------------------------------------------------------
-- Ringkasan bulanan/tahunan bisa disaring ke satu total.
-- Pemasukan/pengeluaran dihitung dari akun transaksinya; jumlah transaksi
-- ikut transfer yang salah satu sisinya ada di total itu.
-- ------------------------------------------------------------
drop function public.months_overview(uuid, integer);
create function public.months_overview(
  p_book_id uuid,
  p_year integer,
  p_total_id uuid default null
)
returns table (month integer, income bigint, expense bigint, tx_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (select private.book_start_day(p_book_id) as day),
  acc as (
    select a.id from public.accounts a
    where a.book_id = p_book_id and a.total_id = p_total_id
  )
  select
    extract(month from private.period_key(t.occurred_at, s.day))::integer as month,
    coalesce(sum(t.amount - coalesce(o.linked, 0)) filter (where t.type = 'income' and not t.is_adjustment), 0)::bigint,
    coalesce(sum(t.amount - coalesce(o.linked, 0)) filter (where t.type = 'expense' and not t.is_adjustment), 0)::bigint,
    count(*)::integer
  from public.transactions t
  cross join s
  left join private.offsets_by_tx(p_book_id) o on o.id = t.id
  where t.book_id = p_book_id
    and t.occurred_at >= private.period_start(make_date(p_year, 1, 1), s.day)
    and t.occurred_at < private.period_start(make_date(p_year + 1, 1, 1), s.day)
    and (
      p_total_id is null
      or t.account_id in (select id from acc)
      or t.to_account_id in (select id from acc)
    )
  group by 1
  order by 1;
$$;

drop function public.years_overview(uuid);
create function public.years_overview(p_book_id uuid, p_total_id uuid default null)
returns table (year integer, income bigint, expense bigint, tx_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (select private.book_start_day(p_book_id) as day),
  acc as (
    select a.id from public.accounts a
    where a.book_id = p_book_id and a.total_id = p_total_id
  )
  select
    extract(year from private.period_key(t.occurred_at, s.day))::integer as year,
    coalesce(sum(t.amount - coalesce(o.linked, 0)) filter (where t.type = 'income' and not t.is_adjustment), 0)::bigint,
    coalesce(sum(t.amount - coalesce(o.linked, 0)) filter (where t.type = 'expense' and not t.is_adjustment), 0)::bigint,
    count(*)::integer
  from public.transactions t
  cross join s
  left join private.offsets_by_tx(p_book_id) o on o.id = t.id
  where t.book_id = p_book_id
    and (
      p_total_id is null
      or t.account_id in (select id from acc)
      or t.to_account_id in (select id from acc)
    )
  group by 1
  order by 1 desc;
$$;

revoke all on function public.months_overview(uuid, integer, uuid) from public, anon;
revoke all on function public.years_overview(uuid, uuid) from public, anon;
grant execute on function public.months_overview(uuid, integer, uuid) to authenticated;
grant execute on function public.years_overview(uuid, uuid) to authenticated;
