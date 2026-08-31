-- ============================================================
-- Yaqui Dictionary — database schema
-- Run this once in the Supabase SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---- Entries ----

create table entries (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  lemma text,
  part_of_speech text,
  etymology text,
  definition_es text,
  definition_en text,
  notes text,
  source text,
  audio_status text not null default 'unavailable' check (audio_status in ('available','unavailable')),
  audio_path text,       -- path within the 'media' storage bucket, e.g. audio/example.mp3
  image_status text not null default 'unavailable' check (image_status in ('available','unavailable')),
  image_path text,       -- path within the 'media' storage bucket, e.g. images/example.jpg
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- Cognates (one entry -> many cognates) ----

create table cognates (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries(id) on delete cascade,
  language text not null,
  form text not null,
  notes text
);

create index cognates_entry_id_idx on cognates(entry_id);

-- ---- Keep updated_at current automatically ----

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger entries_set_updated_at
before update on entries
for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- Anyone can read (this is a public reference dictionary).
-- Only a logged-in (authenticated) user can write.
-- ============================================================

alter table entries enable row level security;
alter table cognates enable row level security;

create policy "Public can read entries" on entries
  for select using (true);

create policy "Authenticated can insert entries" on entries
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated can update entries" on entries
  for update using (auth.role() = 'authenticated');

create policy "Authenticated can delete entries" on entries
  for delete using (auth.role() = 'authenticated');

create policy "Public can read cognates" on cognates
  for select using (true);

create policy "Authenticated can insert cognates" on cognates
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated can update cognates" on cognates
  for update using (auth.role() = 'authenticated');

create policy "Authenticated can delete cognates" on cognates
  for delete using (auth.role() = 'authenticated');
