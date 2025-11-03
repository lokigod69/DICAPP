-- ============================================================================
-- DIC APP - Supabase Schema
-- ============================================================================
-- Run this in your Supabase SQL Editor after creating a new project
--
-- This schema supports:
-- - Multi-user with RLS (Row Level Security)
-- - Public/private deck visibility
-- - Google OAuth + Magic Link auth
-- - Server-side CSV imports with audit logs
-- - Deck merge operations with history
-- ============================================================================

-- Extensions
create extension if not exists pgcrypto;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Automatically set user_id to the authenticated user
create or replace function public.set_auth_user_id()
returns trigger language plpgsql security definer as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

-- Touch updated_at timestamp
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- Tables
-- ============================================================================

-- Profiles (extended user info)
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_self_owned"
  on public.profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Decks
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  slug text not null,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  profile text not null check (profile in ('simple', 'full')),
  config jsonb not null default '{
    "newPerDay": 10,
    "dueLimit": 20,
    "leechThreshold": 8,
    "studyOrientation": "word-to-def",
    "learningReveal": "minimal"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index decks_user_slug_idx on public.decks(user_id, slug);
create index decks_user_id_idx on public.decks(user_id);
create index decks_visibility_idx on public.decks(visibility);

alter table public.decks enable row level security;

create policy "decks_owner_full_access"
  on public.decks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "decks_public_readable"
  on public.decks for select
  using (visibility = 'public');

create trigger decks_set_user_id
  before insert on public.decks
  for each row execute function public.set_auth_user_id();

create trigger decks_touch_updated_at
  before update on public.decks
  for each row execute function public.touch_updated_at();

-- Words
create table public.words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  deck_id uuid not null references public.decks(id) on delete cascade,
  headword text not null,
  definition text not null,
  pos text default '',
  ipa text default '',
  example text default '',
  gloss_de text default '',
  etymology text default '',
  mnemonic text default '',
  tags text default '', -- semicolon-separated
  freq double precision default 3.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index words_user_id_idx on public.words(user_id);
create index words_deck_id_idx on public.words(deck_id);
create index words_headword_idx on public.words(lower(headword));
create index words_deleted_at_idx on public.words(deleted_at) where deleted_at is null;

alter table public.words enable row level security;

create policy "words_owner_full_access"
  on public.words for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "words_public_deck_readable"
  on public.words for select
  using (
    exists (
      select 1 from public.decks d
      where d.id = deck_id
        and d.visibility = 'public'
    )
  );

create trigger words_set_user_id
  before insert on public.words
  for each row execute function public.set_auth_user_id();

create trigger words_touch_updated_at
  before update on public.words
  for each row execute function public.touch_updated_at();

-- Scheduling (SM-2 algorithm state)
create table public.scheduling (
  word_id uuid primary key references public.words(id) on delete cascade,
  due_ts bigint not null, -- Unix timestamp (ms)
  interval int not null default 0,
  ease double precision not null default 2.5,
  lapses int not null default 0,
  is_new int not null default 1 check (is_new in (0, 1))
);

create index scheduling_due_ts_idx on public.scheduling(due_ts);
create index scheduling_is_new_idx on public.scheduling(is_new);

alter table public.scheduling enable row level security;

create policy "scheduling_owner_access"
  on public.scheduling for all
  using (
    exists (
      select 1 from public.words w
      where w.id = word_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.words w
      where w.id = word_id and w.user_id = auth.uid()
    )
  );

-- Reviews (study history)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  word_id uuid not null references public.words(id) on delete cascade,
  ts bigint not null, -- Unix timestamp (ms)
  grade int not null check (grade in (1, 2, 3, 4)),
  elapsed_ms int not null,
  created_at timestamptz not null default now()
);

create index reviews_user_id_idx on public.reviews(user_id);
create index reviews_word_id_ts_idx on public.reviews(word_id, ts desc);

alter table public.reviews enable row level security;

create policy "reviews_owner_full_access"
  on public.reviews for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger reviews_set_user_id
  before insert on public.reviews
  for each row execute function public.set_auth_user_id();

-- Settings (per-user key-value store)
create table public.settings (
  user_id uuid primary key,
  key text not null,
  value text not null,
  unique(user_id, key)
);

alter table public.settings enable row level security;

create policy "settings_self_owned"
  on public.settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger settings_set_user_id
  before insert on public.settings
  for each row execute function public.set_auth_user_id();

-- Ingests (CSV import audit log)
create table public.ingests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  deck_id uuid references public.decks(id) on delete set null,
  filename text not null,
  storage_path text not null,
  profile text not null check (profile in ('simple', 'full')),
  rows_inserted int not null default 0,
  rows_skipped int not null default 0,
  errors jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index ingests_user_id_idx on public.ingests(user_id);
create index ingests_deck_id_idx on public.ingests(deck_id);

alter table public.ingests enable row level security;

create policy "ingests_owner_full_access"
  on public.ingests for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger ingests_set_user_id
  before insert on public.ingests
  for each row execute function public.set_auth_user_id();

-- Merge Logs (deck merge history)
create table public.merge_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  from_deck_id uuid not null,
  to_deck_id uuid not null,
  strategy text not null check (strategy in ('skip-duplicates', 'merge-fields', 'force-move')),
  report jsonb not null,
  created_at timestamptz not null default now()
);

create index merge_logs_user_id_idx on public.merge_logs(user_id);
create index merge_logs_created_at_idx on public.merge_logs(created_at desc);

alter table public.merge_logs enable row level security;

create policy "merge_logs_owner_full_access"
  on public.merge_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger merge_logs_set_user_id
  before insert on public.merge_logs
  for each row execute function public.set_auth_user_id();

-- ============================================================================
-- Storage
-- ============================================================================

-- Create 'uploads' bucket for CSV files
-- Run this in the Supabase Dashboard > Storage section:
--
-- Bucket name: uploads
-- Public: false
-- File size limit: 10 MB
-- Allowed MIME types: text/csv, application/csv
--
-- Policies:
-- 1. Insert: authenticated users can upload to their own folder
--    (bucket_id = 'uploads') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- 2. Select: authenticated users can read their own files
--    (bucket_id = 'uploads') AND (auth.uid()::text = (storage.foldername(name))[1])

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Composite indexes for common queries
create index words_deck_created_idx on public.words(deck_id, created_at desc);
create index scheduling_word_due_idx on public.scheduling(word_id, due_ts);
create index reviews_word_ts_idx on public.reviews(word_id, ts desc);

-- ============================================================================
-- Notes
-- ============================================================================
--
-- After running this schema:
-- 1. Enable Google OAuth in Supabase Dashboard > Authentication > Providers
-- 2. Create the 'uploads' storage bucket with policies as described above
-- 3. Get your Project URL and anon key from Settings > API
-- 4. Add to apps/desktop/.env:
--    PUBLIC_SUPABASE_URL=https://your-project.supabase.co
--    PUBLIC_SUPABASE_ANON_KEY=your-anon-key
--
-- ============================================================================
