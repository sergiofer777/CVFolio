create table if not exists public.minigame_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  game_type text not null check (game_type in ('snake', 'runner', 'skills', 'flappy')),
  score integer not null check (score >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists minigame_scores_user_game_unique
  on public.minigame_scores (user_id, game_type)
  where user_id is not null;

create index if not exists minigame_scores_game_type_score_idx
  on public.minigame_scores (game_type, score desc, updated_at asc);
