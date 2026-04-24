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

-- Row-level security: users can only access their own roadmaps
alter table roadmaps enable row level security;

create policy "Users can read own roadmaps"
  on roadmaps for select
  using (created_by = auth.uid());

create policy "Users can insert own roadmaps"
  on roadmaps for insert
  with check (created_by = auth.uid());

create policy "Users can update own roadmaps"
  on roadmaps for update
  using (created_by = auth.uid());

create policy "Users can delete own roadmaps"
  on roadmaps for delete
  using (created_by = auth.uid());

-- Enable Realtime for live sync
-- Run this separately in the Supabase dashboard:
--   Table Editor → roadmaps → Realtime → Enable
