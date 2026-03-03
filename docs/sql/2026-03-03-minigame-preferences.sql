create table if not exists public.minigame_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_scores boolean not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
