-- RuangRapat: skema database PostgreSQL untuk Supabase
-- Jalankan di Supabase: SQL Editor > New query > tempel seluruh isi file ini > Run.

create extension if not exists pgcrypto;

-- ============ PROFIL AKUN ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'anggota' check (role in ('anggota','host','admin')),
  status text not null default 'aktif' check (status in ('aktif','menunggu','diblokir')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'aktif');
$$;

-- Buat profil otomatis saat akun baru terdaftar
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case when first_user then 'admin' else 'anggota' end,
    'aktif'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cegah pengguna biasa mengubah peran atau status dirinya sendiri
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.email := old.email;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ============ RUANG MEETING ============
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  host_id uuid references public.profiles(id) on delete set null,
  password_hash text,
  starts_at timestamptz,
  max_participants int not null default 50,
  waiting_room boolean not null default false,
  mic_off_on_join boolean not null default true,
  cam_off_on_join boolean not null default true,
  ask_location boolean not null default false,
  status text not null default 'terjadwal' check (status in ('terjadwal','berlangsung','selesai')),
  created_via text not null default 'web',
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists rooms_host_idx on public.rooms (host_id);
create index if not exists rooms_status_idx on public.rooms (status);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  location_shared boolean not null default false,
  lat double precision,
  lng double precision
);
create index if not exists participants_room_idx on public.participants (room_id);

-- Verifikasi sandi ruang tanpa pernah mengirim hash ke klien
create or replace function public.verify_room_password(p_code text, p_password text)
returns boolean language plpgsql security definer set search_path = public as $$
declare h text;
begin
  select password_hash into h from public.rooms where code = p_code;
  if h is null then return true; end if;
  return h = crypt(coalesce(p_password, ''), h);
end;
$$;
revoke all on function public.verify_room_password(text, text) from public, anon, authenticated;

-- Simpan sandi ruang sebagai hash bcrypt
create or replace function public.set_room_password(p_room uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.rooms
     set password_hash = case when coalesce(p_password, '') = '' then null else crypt(p_password, gen_salt('bf')) end
   where id = p_room;
end;
$$;
revoke all on function public.set_room_password(uuid, text) from public, anon, authenticated;

-- ============ ALAT / PROJECT TERHUBUNG (diatur admin) ============
create table if not exists public.tools (
  id text primary key,
  name text not null,
  category text not null,
  description text not null default '',
  status text not null default 'aktif' check (status in ('aktif','maintenance','nonaktif')),
  updated_at timestamptz not null default now()
);

insert into public.tools (id, name, category, description, status) values
  ('tictactoe','Tic-tac-toe','Game','Game dua pemain dari project game','aktif'),
  ('kuis','Kuis langsung','Kuis','Soal dan jawaban real-time dari platform kuis','aktif'),
  ('ruang-virtual','Ruang virtual','Kerja bersama','Ruang kerja bersama selama rapat','aktif'),
  ('tugas','Tugas bersama','Kerja bersama','Papan tugas yang dikerjakan bareng saat rapat','aktif'),
  ('papan-tulis','Papan tulis','Kolaborasi','Kanvas gambar bersama','maintenance'),
  ('breakout','Breakout room','Rapat','Bagi peserta ke ruang kecil','nonaktif')
on conflict (id) do nothing;

-- ============ PELANGGARAN ============
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_name text not null default '',
  type text not null,
  severity text not null default 'Sedang' check (severity in ('Tinggi','Sedang','Rendah')),
  status text not null default 'terbuka' check (status in ('terbuka','ditinjau','selesai')),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ============ KUNCI API ============
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{rooms}',
  status text not null default 'aktif' check (status in ('aktif','dicabut')),
  request_count bigint not null default 0,
  last_used_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ KEBIJAKAN (satu baris) ============
create table if not exists public.policies (
  id int primary key default 1 check (id = 1),
  require_waiting_room boolean not null default true,
  cam_mic_off_on_join boolean not null default true,
  host_may_ask_location boolean not null default true,
  allow_recording boolean not null default false,
  org_only_create boolean not null default false,
  org_domain text not null default '',
  max_minutes int not null default 120,
  api_webhook_url text not null default '',
  api_allowed_origins text not null default '',
  api_rate_limit int not null default 300,
  updated_at timestamptz not null default now()
);
insert into public.policies (id) values (1) on conflict (id) do nothing;

-- ============ LOG AKTIVITAS ============
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'Sistem',
  action text not null,
  tone text not null default 'info' check (tone in ('ok','warn','info')),
  created_at timestamptz not null default now()
);
create index if not exists audit_log_time_idx on public.audit_log (created_at desc);

-- ============ KONTAK ============
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists contacts_owner_idx on public.contacts (owner_id);

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.tools enable row level security;
alter table public.reports enable row level security;
alter table public.api_keys enable row level security;
alter table public.policies enable row level security;
alter table public.audit_log enable row level security;
alter table public.contacts enable row level security;

-- Profil
create policy "profil: lihat sendiri atau admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profil: ubah sendiri atau admin" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- Ruang (gabung lewat server, jadi hanya host/admin yang boleh membaca langsung)
create policy "ruang: host atau admin" on public.rooms for select using (host_id = auth.uid() or public.is_admin());
create policy "ruang: host membuat" on public.rooms for insert with check (host_id = auth.uid());
create policy "ruang: host mengubah" on public.rooms for update using (host_id = auth.uid() or public.is_admin());

-- Peserta
create policy "peserta: host atau admin" on public.participants for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.rooms r where r.id = room_id and r.host_id = auth.uid())
);

-- Alat: semua orang boleh melihat status, hanya admin yang mengubah
create policy "alat: semua boleh lihat" on public.tools for select using (true);
create policy "alat: admin mengubah" on public.tools for update using (public.is_admin());

-- Pelanggaran
create policy "laporan: buat sendiri" on public.reports for insert with check (reporter_id = auth.uid());
create policy "laporan: lihat sendiri atau admin" on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "laporan: admin mengubah" on public.reports for update using (public.is_admin());

-- API, kebijakan, log: admin saja (kebijakan boleh dibaca pengguna masuk)
create policy "api: admin" on public.api_keys for all using (public.is_admin()) with check (public.is_admin());
create policy "kebijakan: baca" on public.policies for select using (auth.uid() is not null);
create policy "kebijakan: admin mengubah" on public.policies for update using (public.is_admin());
create policy "log: admin" on public.audit_log for select using (public.is_admin());

-- Kontak
create policy "kontak: milik sendiri" on public.contacts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
