-- AI Screenplay Studio: tables for accounts, sign-in sessions, and saved stories.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (everything uses IF NOT EXISTS).

create table if not exists public.users (
  id            uuid primary key,
  email         text not null unique,          -- always stored lowercase by the app
  name          text not null,
  password_hash text not null,                 -- scrypt hash, never the password
  created_at    bigint not null                -- milliseconds since epoch
);

create table if not exists public.sessions (
  token_hash text primary key,                 -- SHA-256 of the cookie token
  user_id    uuid not null references public.users (id) on delete cascade,
  expires_at bigint not null
);
create index if not exists sessions_user_idx on public.sessions (user_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

create table if not exists public.projects (
  id              uuid primary key,
  user_id         uuid not null references public.users (id) on delete cascade,
  title           text not null,
  draft           jsonb not null,              -- the whole story
  scene_count     integer not null default 0,
  character_count integer not null default 0,
  logline         text not null default '',
  language        text not null default 'English',
  progress        integer,
  created_at      bigint not null,
  updated_at      bigint not null
);
create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

-- Lock the tables down. The app talks to them only from the server with the
-- secret key (which bypasses RLS); the public/anon key must never be able to read
-- passwords or stories, so there are deliberately NO policies.
alter table public.users    enable row level security;
alter table public.sessions enable row level security;
alter table public.projects enable row level security;

revoke all on public.users, public.sessions, public.projects from anon, authenticated;
