-- Run this in the Supabase SQL editor for your project

create table if not exists roadmaps (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  workstreams jsonb not null default '[]',
  features    jsonb not null default '[]',
  next_id     int  not null default 1,
  created_by  uuid references auth.users on delete set null,
  updated_at  timestamptz default now()
);

-- Keep updated_at current automatically
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger roadmaps_updated_at
  before update on roadmaps
  for each row execute function update_updated_at();

-- Row-level security: all authenticated users can read/write all roadmaps
alter table roadmaps enable row level security;

create policy "Authenticated users can manage roadmaps"
  on roadmaps for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Enable Realtime for live sync
-- Run this separately in the Supabase dashboard:
--   Table Editor → roadmaps → Realtime → Enable
