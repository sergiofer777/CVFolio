-- Security hardening: enable RLS + strict per-user policies
-- Fecha: 2026-03-05
--
-- Nota:
-- - Estas políticas aplican a conexiones con rol anon/authenticated.
-- - El rol service_role (backend) sigue funcionando y bypass RLS.

begin;

-- ---------------------------------------------------------------------------
-- 1) Enable RLS on sensitive tables
-- ---------------------------------------------------------------------------
alter table if exists public.profiles enable row level security;
alter table if exists public.portfolios enable row level security;
alter table if exists public.cv_uploads enable row level security;
alter table if exists public.billing_usage enable row level security;
alter table if exists public.domain_requests enable row level security;
alter table if exists public.billing_subscriptions enable row level security;
alter table if exists public.profile_slug_changes enable row level security;
alter table if exists public.minigame_preferences enable row level security;
alter table if exists public.minigame_scores enable row level security;

-- ---------------------------------------------------------------------------
-- 2) profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 3) portfolios
-- ---------------------------------------------------------------------------
drop policy if exists "portfolios_select_own" on public.portfolios;
create policy "portfolios_select_own"
  on public.portfolios
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "portfolios_insert_own" on public.portfolios;
create policy "portfolios_insert_own"
  on public.portfolios
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "portfolios_update_own" on public.portfolios;
create policy "portfolios_update_own"
  on public.portfolios
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "portfolios_delete_own" on public.portfolios;
create policy "portfolios_delete_own"
  on public.portfolios
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) cv_uploads
-- ---------------------------------------------------------------------------
drop policy if exists "cv_uploads_select_own" on public.cv_uploads;
create policy "cv_uploads_select_own"
  on public.cv_uploads
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "cv_uploads_insert_own" on public.cv_uploads;
create policy "cv_uploads_insert_own"
  on public.cv_uploads
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "cv_uploads_update_own" on public.cv_uploads;
create policy "cv_uploads_update_own"
  on public.cv_uploads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cv_uploads_delete_own" on public.cv_uploads;
create policy "cv_uploads_delete_own"
  on public.cv_uploads
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5) billing_usage
-- ---------------------------------------------------------------------------
drop policy if exists "billing_usage_select_own" on public.billing_usage;
create policy "billing_usage_select_own"
  on public.billing_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "billing_usage_insert_own" on public.billing_usage;
create policy "billing_usage_insert_own"
  on public.billing_usage
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "billing_usage_update_own" on public.billing_usage;
create policy "billing_usage_update_own"
  on public.billing_usage
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6) domain_requests
-- ---------------------------------------------------------------------------
drop policy if exists "domain_requests_select_own" on public.domain_requests;
create policy "domain_requests_select_own"
  on public.domain_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "domain_requests_insert_own" on public.domain_requests;
create policy "domain_requests_insert_own"
  on public.domain_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "domain_requests_update_own" on public.domain_requests;
create policy "domain_requests_update_own"
  on public.domain_requests
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7) billing_subscriptions
-- ---------------------------------------------------------------------------
drop policy if exists "billing_subscriptions_select_own" on public.billing_subscriptions;
create policy "billing_subscriptions_select_own"
  on public.billing_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8) profile_slug_changes
-- ---------------------------------------------------------------------------
drop policy if exists "profile_slug_changes_select_own" on public.profile_slug_changes;
create policy "profile_slug_changes_select_own"
  on public.profile_slug_changes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profile_slug_changes_insert_own" on public.profile_slug_changes;
create policy "profile_slug_changes_insert_own"
  on public.profile_slug_changes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9) minigame_preferences
-- ---------------------------------------------------------------------------
drop policy if exists "minigame_preferences_select_own" on public.minigame_preferences;
create policy "minigame_preferences_select_own"
  on public.minigame_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "minigame_preferences_insert_own" on public.minigame_preferences;
create policy "minigame_preferences_insert_own"
  on public.minigame_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "minigame_preferences_update_own" on public.minigame_preferences;
create policy "minigame_preferences_update_own"
  on public.minigame_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 10) minigame_scores
-- Keep direct client access closed by default (no authenticated policies).
-- API routes with service_role can still read/write this table.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 11) Storage policies for private CV files (bucket: cv-uploads)
-- ---------------------------------------------------------------------------
drop policy if exists "cv_uploads_storage_select_own" on storage.objects;
create policy "cv_uploads_storage_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'cv-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cv_uploads_storage_insert_own" on storage.objects;
create policy "cv_uploads_storage_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'cv-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cv_uploads_storage_delete_own" on storage.objects;
create policy "cv_uploads_storage_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'cv-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
