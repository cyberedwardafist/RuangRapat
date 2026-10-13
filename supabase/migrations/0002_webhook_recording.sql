-- RuangRapat: webhook dan perekaman
-- Jalankan SETELAH 0001_init.sql.

alter table public.policies
  add column if not exists api_webhook_secret text not null default encode(gen_random_bytes(24), 'hex');

-- Pastikan baris kebijakan yang sudah ada punya rahasia unik
update public.policies set api_webhook_secret = encode(gen_random_bytes(24), 'hex') where api_webhook_secret = '';

create table if not exists public.webhook_deliveries (
  id bigint generated always as identity primary key,
  event text not null,
  url text not null,
  status_code int,
  ok boolean not null default false,
  error text not null default '',
  duration_ms int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists webhook_deliveries_time_idx on public.webhook_deliveries (created_at desc);

alter table public.webhook_deliveries enable row level security;
create policy "webhook: admin" on public.webhook_deliveries for select using (public.is_admin());

-- Catatan perekaman (tanpa menyimpan berkas; berkas diunduh host ke perangkatnya)
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  stopped_at timestamptz
);
alter table public.recordings enable row level security;
create policy "rekaman: host atau admin" on public.recordings for select using (
  public.is_admin() or exists (select 1 from public.rooms r where r.id = room_id and r.host_id = auth.uid())
);
