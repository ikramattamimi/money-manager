-- ============================================================
-- Baseline schema Money Manager.
--
-- * Semua data milik buku (books), bukan milik user. Akses lewat
--   book_members; RLS ada di migration 20261024094747_rls.sql.
-- * Nominal disimpan sebagai bigint rupiah utuh.
-- * Saldo akun tidak disimpan, dihitung lewat view account_balances.
-- * Transfer = 1 baris (account_id -> to_account_id, plus fee).
-- * Relasi antar tabel memakai foreign key komposit (id, book_id), jadi
--   transaksi tidak bisa menunjuk akun atau kategori dari buku lain.
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- Fungsi internal (helper RLS, trigger) tidak diekspos lewat API.
create schema if not exists private;
grant usage on schema private to authenticated;

-- ------------------------------------------------------------
-- Enum
-- ------------------------------------------------------------
create type public.book_role as enum ('owner', 'editor', 'viewer');
create type public.account_kind as enum (
  'cash', 'bank', 'ewallet', 'card', 'savings', 'investment', 'receivable', 'loan', 'other'
);
create type public.category_kind as enum ('income', 'expense');
create type public.transaction_type as enum ('income', 'expense', 'transfer');
create type public.transaction_source as enum (
  'manual', 'quick_add', 'template', 'recurring', 'import_realbyte', 'import_bank', 'ocr'
);
create type public.recurring_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.budget_period as enum ('monthly');
create type public.import_source as enum ('realbyte_xlsx', 'bank_statement');
create type public.import_status as enum ('committed', 'reverted');

-- ------------------------------------------------------------
-- updated_at
-- ------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Pengguna dan buku
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  currency text not null default 'IDR' check (currency = 'IDR'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.book_members (
  book_id uuid not null references public.books (id) on delete cascade,
  -- Ke profiles (bukan auth.users) supaya nama anggota bisa di-embed lewat API
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.book_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (book_id, user_id)
);
create index book_members_user_id_idx on public.book_members (user_id);

create table public.book_invites (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%_@_%'),
  role public.book_role not null default 'editor' check (role <> 'owner'),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index book_invites_book_id_idx on public.book_invites (book_id);
create index book_invites_invited_by_idx on public.book_invites (invited_by);
create index book_invites_accepted_by_idx on public.book_invites (accepted_by);

-- ------------------------------------------------------------
-- Akun
-- ------------------------------------------------------------
create table public.account_groups (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  kind public.account_kind not null default 'other',
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, book_id)
);
create index account_groups_book_id_idx on public.account_groups (book_id, sort);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  group_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 60),
  opening_balance bigint not null default 0,
  include_in_total boolean not null default true,
  archived boolean not null default false,
  sort integer not null default 0,
  note text not null default '',
  statement_day smallint check (statement_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, book_id),
  foreign key (group_id, book_id) references public.account_groups (id, book_id)
);
create index accounts_book_id_idx on public.accounts (book_id, sort);
create index accounts_group_id_idx on public.accounts (group_id, book_id);

-- ------------------------------------------------------------
-- Kategori (2 level)
-- ------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  parent_id uuid,
  kind public.category_kind not null,
  name text not null check (length(trim(name)) between 1 and 60),
  emoji text not null default '',
  sort integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, book_id),
  foreign key (parent_id, book_id) references public.categories (id, book_id) on delete cascade,
  check (parent_id is null or parent_id <> id)
);
create index categories_book_id_idx on public.categories (book_id, kind, sort);
create index categories_parent_id_idx on public.categories (parent_id, book_id);

-- Induk harus kategori utama dengan jenis yang sama (maksimal 2 level).
create function private.check_category_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent public.categories;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into v_parent from public.categories c where c.id = new.parent_id;
  if v_parent.parent_id is not null then
    raise exception 'Subkategori tidak bisa punya subkategori lagi (maksimal 2 level)'
      using errcode = '23514';
  end if;
  if v_parent.kind <> new.kind then
    raise exception 'Jenis subkategori harus sama dengan kategori induknya' using errcode = '23514';
  end if;
  if exists (select 1 from public.categories c where c.parent_id = new.id) then
    raise exception 'Kategori yang punya subkategori tidak bisa dijadikan subkategori'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger categories_check_parent
  before insert or update of parent_id, kind on public.categories
  for each row execute function private.check_category_parent();

-- ------------------------------------------------------------
-- Impor, template, transaksi berulang
-- ------------------------------------------------------------
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  source public.import_source not null,
  filename text not null default '',
  row_count integer not null default 0,
  status public.import_status not null default 'committed',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, book_id)
);
create index import_batches_book_id_idx on public.import_batches (book_id, created_at desc);
create index import_batches_created_by_idx on public.import_batches (created_by);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  type public.transaction_type not null,
  amount bigint check (amount > 0),
  account_id uuid,
  to_account_id uuid,
  category_id uuid,
  note text not null default '',
  description text not null default '',
  sort integer not null default 0,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, book_id) references public.accounts (id, book_id) on delete cascade,
  foreign key (to_account_id, book_id) references public.accounts (id, book_id) on delete cascade,
  foreign key (category_id, book_id) references public.categories (id, book_id) on delete set null (category_id)
);
create index templates_book_id_idx on public.templates (book_id, sort);
create index templates_account_id_idx on public.templates (account_id, book_id);
create index templates_to_account_id_idx on public.templates (to_account_id, book_id);
create index templates_category_id_idx on public.templates (category_id, book_id);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  type public.transaction_type not null,
  amount bigint not null check (amount > 0),
  account_id uuid not null,
  to_account_id uuid,
  fee bigint not null default 0 check (fee >= 0),
  category_id uuid,
  note text not null default '',
  description text not null default '',
  frequency public.recurring_frequency not null,
  interval smallint not null default 1 check (interval between 1 and 365),
  day_of_month smallint check (day_of_month between 1 and 31),
  start_on date not null,
  end_on date,
  next_run_on date not null,
  auto_post boolean not null default true,
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, book_id),
  foreign key (account_id, book_id) references public.accounts (id, book_id) on delete cascade,
  foreign key (to_account_id, book_id) references public.accounts (id, book_id) on delete cascade,
  foreign key (category_id, book_id) references public.categories (id, book_id) on delete set null (category_id),
  check (end_on is null or end_on >= start_on)
);
create index recurring_rules_book_id_idx on public.recurring_rules (book_id);
create index recurring_rules_due_idx on public.recurring_rules (next_run_on) where active;
create index recurring_rules_account_id_idx on public.recurring_rules (account_id, book_id);
create index recurring_rules_to_account_id_idx on public.recurring_rules (to_account_id, book_id);
create index recurring_rules_category_id_idx on public.recurring_rules (category_id, book_id);
create index recurring_rules_created_by_idx on public.recurring_rules (created_by);

-- ------------------------------------------------------------
-- Transaksi
-- ------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  type public.transaction_type not null,
  occurred_at timestamptz not null default now(),
  amount bigint not null check (amount > 0),
  account_id uuid not null,
  to_account_id uuid,
  fee bigint not null default 0 check (fee >= 0),
  category_id uuid,
  is_adjustment boolean not null default false,
  note text not null default '',
  description text not null default '',
  source public.transaction_source not null default 'manual',
  import_batch_id uuid,
  dedupe_key text,
  recurring_rule_id uuid,
  -- Ke profiles supaya buku bersama bisa menampilkan siapa yang mencatat
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, book_id) references public.accounts (id, book_id) on delete cascade,
  foreign key (to_account_id, book_id) references public.accounts (id, book_id) on delete cascade,
  foreign key (category_id, book_id) references public.categories (id, book_id) on delete set null (category_id),
  foreign key (import_batch_id, book_id) references public.import_batches (id, book_id) on delete cascade,
  foreign key (recurring_rule_id, book_id) references public.recurring_rules (id, book_id) on delete set null (recurring_rule_id),
  unique (book_id, dedupe_key),
  constraint transactions_shape check (
    case type
      when 'transfer' then
        to_account_id is not null and to_account_id <> account_id
        and category_id is null and not is_adjustment
      else
        to_account_id is null and fee = 0
    end
  )
);
create index transactions_book_occurred_idx on public.transactions (book_id, occurred_at desc);
create index transactions_account_idx on public.transactions (account_id, book_id, occurred_at desc);
create index transactions_to_account_idx on public.transactions (to_account_id, book_id)
  where to_account_id is not null;
create index transactions_category_idx on public.transactions (category_id, book_id)
  where category_id is not null;
create index transactions_import_batch_idx on public.transactions (import_batch_id, book_id)
  where import_batch_id is not null;
create index transactions_recurring_rule_idx on public.transactions (recurring_rule_id, book_id)
  where recurring_rule_id is not null;
create index transactions_created_by_idx on public.transactions (created_by);
create index transactions_note_trgm_idx on public.transactions
  using gin (note extensions.gin_trgm_ops);
create index transactions_description_trgm_idx on public.transactions
  using gin (description extensions.gin_trgm_ops);

-- Kategori harus sejenis dengan transaksinya (pemasukan/pengeluaran).
create function private.check_transaction_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_kind public.category_kind;
begin
  if new.category_id is null then
    return new;
  end if;
  select c.kind into v_kind from public.categories c where c.id = new.category_id;
  if v_kind::text <> new.type::text then
    raise exception 'Kategori % tidak cocok untuk transaksi %',
      case v_kind when 'income' then 'pemasukan' else 'pengeluaran' end,
      case new.type when 'income' then 'pemasukan' else 'pengeluaran' end
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger transactions_check_category
  before insert or update of category_id, type on public.transactions
  for each row execute function private.check_transaction_category();

create trigger templates_check_category
  before insert or update of category_id, type on public.templates
  for each row execute function private.check_transaction_category();

create trigger recurring_rules_check_category
  before insert or update of category_id, type on public.recurring_rules
  for each row execute function private.check_transaction_category();

-- ------------------------------------------------------------
-- Budget
-- ------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  category_id uuid,
  amount bigint not null check (amount > 0),
  period public.budget_period not null default 'monthly',
  start_on date not null,
  carry_over boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, book_id) references public.categories (id, book_id) on delete cascade,
  unique nulls not distinct (book_id, category_id, period, start_on)
);
create index budgets_category_id_idx on public.budgets (category_id, book_id);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger books_updated_at before update on public.books
  for each row execute function private.set_updated_at();
create trigger account_groups_updated_at before update on public.account_groups
  for each row execute function private.set_updated_at();
create trigger accounts_updated_at before update on public.accounts
  for each row execute function private.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
create trigger templates_updated_at before update on public.templates
  for each row execute function private.set_updated_at();
create trigger recurring_rules_updated_at before update on public.recurring_rules
  for each row execute function private.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
  for each row execute function private.set_updated_at();
create trigger budgets_updated_at before update on public.budgets
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------
-- Saldo akun (dihitung, tidak disimpan)
-- ------------------------------------------------------------
create view public.account_balances
with (security_invoker = on)
as
select
  a.id as account_id,
  a.book_id,
  a.opening_balance + coalesce(m.delta, 0) as balance
from public.accounts a
left join (
  select account_id, sum(
    case type
      when 'income' then amount
      when 'expense' then -amount
      else -(amount + fee)
    end
  ) as delta
  from (
    select account_id, type, amount, fee from public.transactions
    union all
    -- sisi penerima transfer
    select to_account_id, 'income'::public.transaction_type, amount, 0
    from public.transactions
    where type = 'transfer'
  ) t
  group by account_id
) m on m.account_id = a.id;
