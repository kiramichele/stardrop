-- Optional voice chat for collaborative-assignment groups. One Daily.co
-- room per group (created lazily on first join), plus a join/leave log
-- for accountability on what's otherwise unsupervised time.
--
-- All access goes through the service-role admin client (same convention
-- as the rest of lib/groups-server.ts) — the calling server actions are
-- responsible for verifying the caller is actually a member of the group
-- (or a teacher) before touching these tables, so RLS here is a backstop,
-- not the primary gate.

create table if not exists public.voice_rooms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references public.assignment_groups(id) on delete cascade,
  daily_room_name text not null unique,
  daily_room_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_room_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.assignment_groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  event text not null check (event in ('joined', 'left')),
  created_at timestamptz not null default now()
);

create index if not exists voice_room_events_group_idx
  on public.voice_room_events (group_id, created_at desc);

alter table public.voice_rooms enable row level security;
alter table public.voice_room_events enable row level security;

drop policy if exists "teacher_all" on public.voice_rooms;
create policy "teacher_all" on public.voice_rooms
  for all using (is_teacher()) with check (is_teacher());

drop policy if exists "teacher_all" on public.voice_room_events;
create policy "teacher_all" on public.voice_room_events
  for all using (is_teacher()) with check (is_teacher());

notify pgrst, 'reload schema';
