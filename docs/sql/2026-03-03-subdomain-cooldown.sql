begin;

create table if not exists public.profile_slug_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_slug text,
  next_slug text not null,
  changed_at timestamptz not null default now()
);

create index if not exists profile_slug_changes_user_id_changed_at_idx
  on public.profile_slug_changes (user_id, changed_at desc);

commit;
