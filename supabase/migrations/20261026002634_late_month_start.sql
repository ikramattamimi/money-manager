-- Tanggal awal bulan 20–31 (gajian akhir bulan): periode dimulai di bulan
-- SEBELUM namanya. Awal 25 → periode Oktober = 25 Sep – 24 Okt (dulu 25 Okt –
-- 24 Nov). Awal 1–19 tidak berubah: awal 10 → Oktober = 10 Okt – 9 Nov.
-- Semua RPC per bulan/tahun memakai dua fungsi ini, jadi ikut berubah.
-- Aturan yang sama ada di app/lib/time.ts (LATE_START_DAY).

-- Awal periode p_month (tanggal 1 bulan namanya) sebagai timestamptz WIB
create or replace function private.period_start(p_month date, p_day integer)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  with m as (
    select (date_trunc('month', p_month)
      - case when p_day >= 20 then interval '1 month' else interval '0' end)::date as d
  )
  select make_timestamptz(
    extract(year from m.d)::integer,
    extract(month from m.d)::integer,
    least(
      greatest(p_day, 1),
      extract(day from (m.d + interval '1 month - 1 day'))::integer
    ),
    0, 0, 0, 'Asia/Jakarta'
  )
  from m;
$$;

-- Kunci periode (tanggal 1 bulan namanya) tempat sebuah waktu jatuh
create or replace function private.period_key(p_at timestamptz, p_day integer)
returns date
language sql
stable
set search_path = ''
as $$
  -- Periode yang mulai di bulan kalender p_at
  with n as (
    select (date_trunc('month', p_at at time zone 'Asia/Jakarta')
      + case when p_day >= 20 then interval '1 month' else interval '0' end)::date as d
  )
  select case
    when p_at >= private.period_start(n.d, p_day) then n.d
    else (n.d - interval '1 month')::date
  end
  from n;
$$;
