-- Fix infinite recursion in RLS policies
-- The problem: policies on `profiles` query `profiles` to check role, causing recursion.
-- The fix: use auth.jwt() or restructure policies to avoid self-referencing subqueries.

-- 1. Drop the problematic policies
drop policy if exists "Super admins can manage all profiles." on profiles;
drop policy if exists "Super admins and editors can manage articles." on articles;
drop policy if exists "Super admins can manage all payments." on payments;
drop policy if exists "Super admins can manage all settlements." on settlements;
drop policy if exists "Super admins and editors can manage all feedback." on community_feedback;

-- 2. Create a security definer function to safely check role without triggering RLS
create or replace function public.get_user_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- 3. Recreate policies using the helper function (bypasses RLS on profiles)
create policy "Super admins can manage all profiles."
  on profiles for all using (
    public.get_user_role() = 'super_admin'::user_role
  );

create policy "Super admins and editors can manage articles."
  on articles for all using (
    public.get_user_role() in ('super_admin'::user_role, 'editor'::user_role)
  );

create policy "Super admins can manage all payments."
  on payments for all using (
    public.get_user_role() = 'super_admin'::user_role
  );

create policy "Super admins can manage all settlements."
  on settlements for all using (
    public.get_user_role() = 'super_admin'::user_role
  );

create policy "Super admins and editors can manage all feedback."
  on community_feedback for all using (
    public.get_user_role() in ('super_admin'::user_role, 'editor'::user_role)
  );
