# Fase 9: Berbagi Buku

## Why
App akan dipakai orang lain juga. Setiap orang punya buku sendiri, dan bisa
berbagi buku dengan pasangan atau keluarga. Schema, RLS, dan RPC undangan
sudah dibuat di fase 2. Yang belum ada adalah UI-nya.

## What
Kelola buku (buat, ganti nama, pindah), undang anggota lewat email, atur
peran, dan keluar dari buku.

## Constraints
### Must
- Setiap layar tahu buku aktif. Buku aktif disimpan per perangkat, dan semua
  query key menyertakan `bookId`
- Peran ditegakkan di database (fase 2 T2). UI hanya menyembunyikan tombol
- Pemilik terakhir tidak bisa keluar atau menurunkan perannya sendiri
- Transaksi di buku bersama menampilkan siapa yang mencatat

### Must Not
- Menampilkan email anggota ke viewer kalau tidak perlu

### Out of Scope
- Pindah transaksi antar buku
- Notifikasi push saat anggota lain mencatat

## Current State
- Relevant files:
  - Tabel `books`, `book_members`, `book_invites`, RPC `create_invite`,
    `accept_invite` (fase 2)
- Existing patterns:
  - Query key per domain (`opnamix/.ai/conventions/data-fetching.md`)

## Tasks

### T1: Buku aktif
**What:** Store buku aktif, pemilih buku di header tab Akun, dan semua key
query diberi `bookId`. Ganti buku = cache buku lain tidak tercampur.
**Files:** `app/features/books/*`, semua `keys.ts`
**Verify:** Ganti buku langsung mengganti semua angka, tanpa ada data buku
sebelumnya yang sempat muncul.

### T2: Kelola buku
**What:** Buat buku baru (dengan kategori default), ganti nama, hapus (dialog,
hanya pemilik).
**Files:** `app/pages/settings/books/*`
**Verify:** Buku baru kosong dan terpisah dari buku pribadi.

### T3: Undangan
**What:** Pemilik mengundang lewat email dengan peran tertentu. Email berisi
link ke `/invite/[token]`. Penerima login dengan OTP memakai email yang sama,
lalu menerima undangan. Daftar undangan yang belum diterima bisa dibatalkan.
**Files:** `app/pages/invite/[token].vue`, `app/pages/settings/books/[id].vue`,
server route pengirim email
**Verify:** Undangan yang dibuka dengan akun berbeda menampilkan pesan yang
jelas, tidak error.

### T4: Anggota dan peran
**What:** Daftar anggota, ubah peran, keluarkan anggota, keluar dari buku.
**Files:** `app/pages/settings/books/[id].vue`
**Verify:** Viewer yang diturunkan dari editor langsung kehilangan tombol tambah,
dan insert langsung lewat API ditolak.
