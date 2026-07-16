-- ─────────────────────────────────────────────────────────────────────────
-- J Charms · 0100 · Admin profiles + is_admin() authorization helper
--
-- A single business owner runs the store. `admin_profiles` is the allow-list:
-- a row here (keyed to an auth.users id) means "this account may enter /admin".
-- Every privileged RLS policy in later migrations gates on public.is_admin().
-- ─────────────────────────────────────────────────────────────────────────

create table public.admin_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

comment on table public.admin_profiles is
  'Allow-list of auth users permitted into the admin panel.';

-- SECURITY DEFINER so the check can read admin_profiles regardless of the
-- caller''s own RLS; STABLE + fixed search_path per Supabase guidance.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles where user_id = auth.uid()
  );
$$;

comment on function public.is_admin is
  'True when the current auth user is in admin_profiles. Used by RLS policies.';

-- RLS: an admin may read the allow-list (e.g. to show "who has access").
-- Inserts/removals are done by the project owner via the Supabase dashboard or
-- a service-role script — never self-serve from the browser.
alter table public.admin_profiles enable row level security;

create policy "admins can read admin profiles"
  on public.admin_profiles for select
  to authenticated
  using (public.is_admin());
