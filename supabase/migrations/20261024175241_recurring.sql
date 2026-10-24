-- Fase 6 T5: transaksi berulang.
-- post_due_recurring() dijalankan pg_cron setiap pagi 07.00 WIB: aturan
-- auto_post langsung jadi transaksi, sisanya jadi "Perlu dikonfirmasi".
-- Aman dijalankan berkali-kali: kunci dedupe per aturan per tanggal.

create extension if not exists pg_cron;

-- ------------------------------------------------------------
-- Antrean konfirmasi
-- ------------------------------------------------------------
create table public.recurring_pending (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  rule_id uuid not null,
  due_on date not null,
  created_at timestamptz not null default now(),
  foreign key (rule_id, book_id) references public.recurring_rules (id, book_id) on delete cascade,
  unique (rule_id, due_on)
);
create index recurring_pending_book_id_idx on public.recurring_pending (book_id, due_on);

alter table public.recurring_pending enable row level security;
create policy "recurring_pending: anggota bisa membaca" on public.recurring_pending
  for select to authenticated using (private.is_book_member(book_id));
create policy "recurring_pending: owner/editor bisa menghapus" on public.recurring_pending
  for delete to authenticated using (private.can_edit_book(book_id));

-- ------------------------------------------------------------
-- Tanggal berikutnya
-- ------------------------------------------------------------
-- Bulanan/tahunan memakai tanggal jangkar (day_of_month, atau tanggal mulai);
-- bulan yang lebih pendek memakai tanggal terakhirnya (31 → 30 Nov, 28/29 Feb).
create function private.recurring_next(
  p_frequency public.recurring_frequency,
  p_interval smallint,
  p_anchor smallint,
  p_from date
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_frequency
    when 'daily' then p_from + p_interval
    when 'weekly' then p_from + 7 * p_interval
    else (
      select make_date(
        extract(year from m)::int,
        extract(month from m)::int,
        least(p_anchor, extract(day from (m + interval '1 month - 1 day'))::int)
      )
      from (
        select date_trunc('month', p_from::timestamp)
          + case p_frequency when 'monthly' then make_interval(months => p_interval)
                             else make_interval(years => p_interval) end as m
      ) x
    )
  end;
$$;

-- Tanggal jangkar disimpan di day_of_month supaya 31 tetap 31 setelah lewat
-- bulan pendek; tanggal pertama dihitung saat aturan dibuat/diubah.
create function private.recurring_rules_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.frequency in ('monthly', 'yearly') and new.day_of_month is null then
    new.day_of_month := extract(day from new.start_on)::smallint;
  end if;
  if tg_op = 'INSERT'
     or new.start_on is distinct from old.start_on
     or new.frequency is distinct from old.frequency
     or new.day_of_month is distinct from old.day_of_month then
    new.next_run_on := case
      when new.frequency in ('monthly', 'yearly') then make_date(
        extract(year from new.start_on)::int,
        extract(month from new.start_on)::int,
        least(new.day_of_month,
          extract(day from (date_trunc('month', new.start_on::timestamp) + interval '1 month - 1 day'))::int)
      )
      else new.start_on
    end;
    -- Jangkar di bulan mulai sudah lewat: mulai bulan/tahun berikutnya
    if new.next_run_on < new.start_on then
      new.next_run_on := private.recurring_next(new.frequency, new.interval, new.day_of_month, new.next_run_on);
    end if;
  end if;
  return new;
end;
$$;

create trigger recurring_rules_defaults
  before insert or update of start_on, frequency, day_of_month on public.recurring_rules
  for each row execute function private.recurring_rules_defaults();

-- ------------------------------------------------------------
-- Posting
-- ------------------------------------------------------------
create function private.post_recurring_on(p_rule public.recurring_rules, p_due date, p_amount bigint)
returns uuid
language sql
set search_path = ''
as $$
  insert into public.transactions (
    book_id, type, occurred_at, amount, account_id, to_account_id, fee, category_id,
    note, description, source, recurring_rule_id, dedupe_key, created_by
  )
  values (
    p_rule.book_id, p_rule.type,
    (p_due + time '07:00') at time zone 'Asia/Jakarta',
    coalesce(p_amount, p_rule.amount), p_rule.account_id,
    case when p_rule.type = 'transfer' then p_rule.to_account_id end,
    case when p_rule.type = 'transfer' then p_rule.fee else 0 end,
    case when p_rule.type <> 'transfer' then p_rule.category_id end,
    coalesce(nullif(p_rule.note, ''), p_rule.name), p_rule.description,
    'recurring', p_rule.id, 'rr:' || p_rule.id || ':' || p_due, p_rule.created_by
  )
  on conflict (book_id, dedupe_key) do nothing
  returning id;
$$;

-- p_book_id null = semua buku (pg_cron). Dari app: hanya buku yang bisa diubah
-- pemanggil, supaya aturan baru hari ini langsung tercatat tanpa menunggu besok.
create function public.post_due_recurring(p_book_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_rule public.recurring_rules;
  v_count integer := 0;
  v_guard integer;
begin
  if (select auth.uid()) is not null
     and (p_book_id is null or not private.can_edit_book(p_book_id)) then
    raise exception 'Kamu tidak punya akses mengubah buku ini' using errcode = '42501';
  end if;

  for v_rule in
    select * from public.recurring_rules r
    where r.active and r.next_run_on <= v_today
      and (p_book_id is null or r.book_id = p_book_id)
    for update skip locked
  loop
    v_guard := 0;
    while v_rule.next_run_on <= v_today
      and (v_rule.end_on is null or v_rule.next_run_on <= v_rule.end_on)
      and v_guard < 400
    loop
      if v_rule.auto_post then
        if private.post_recurring_on(v_rule, v_rule.next_run_on, null) is not null then
          v_count := v_count + 1;
        end if;
      else
        insert into public.recurring_pending (book_id, rule_id, due_on)
        values (v_rule.book_id, v_rule.id, v_rule.next_run_on)
        on conflict (rule_id, due_on) do nothing;
      end if;
      v_rule.next_run_on := private.recurring_next(
        v_rule.frequency, v_rule.interval, v_rule.day_of_month, v_rule.next_run_on);
      v_guard := v_guard + 1;
    end loop;

    update public.recurring_rules
    set next_run_on = v_rule.next_run_on,
        active = v_rule.end_on is null or v_rule.next_run_on <= v_rule.end_on
    where id = v_rule.id;
  end loop;
  return v_count;
end;
$$;

-- Konfirmasi draf: catat (boleh dengan nominal lain) lalu hapus dari antrean
create function public.confirm_recurring(p_pending_id uuid, p_amount bigint default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pending public.recurring_pending;
  v_rule public.recurring_rules;
  v_id uuid;
begin
  select * into v_pending from public.recurring_pending where id = p_pending_id;
  if not found then
    raise exception 'Draf tidak ditemukan' using errcode = 'P0002';
  end if;
  if not private.can_edit_book(v_pending.book_id) then
    raise exception 'Kamu tidak punya akses mengubah buku ini' using errcode = '42501';
  end if;
  if p_amount is not null and p_amount <= 0 then
    raise exception 'Nominal harus lebih dari 0' using errcode = '23514';
  end if;
  select * into v_rule from public.recurring_rules where id = v_pending.rule_id;
  v_id := private.post_recurring_on(v_rule, v_pending.due_on, p_amount);
  delete from public.recurring_pending where id = p_pending_id;
  return v_id;
end;
$$;

revoke all on function public.post_due_recurring(uuid) from public, anon;
revoke all on function public.confirm_recurring(uuid, bigint) from public, anon;
grant execute on function public.post_due_recurring(uuid) to authenticated;
grant execute on function public.confirm_recurring(uuid, bigint) to authenticated;
grant execute on function private.post_recurring_on(public.recurring_rules, date, bigint) to authenticated;

-- Setiap hari 07.00 WIB (00.00 UTC)
select cron.schedule('post-due-recurring', '0 0 * * *', 'select public.post_due_recurring()');
