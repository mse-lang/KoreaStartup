-- Replace the existing handle_new_user function to enforce RBAC rules for KoreaStartup.kr

create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
begin
  -- Enforce Master Plan access control rules
  if new.email in ('mse@venturesquare.net', 'admin@venturesquare.net') then
    assigned_role := 'super_admin'::public.user_role;
  elsif new.email = 'editor@venturesquare.net' then
    assigned_role := 'editor'::public.user_role;
  else
    assigned_role := 'user'::public.user_role;
  end if;

  insert into public.profiles (id, nickname, role)
  values (new.id, split_part(new.email, '@', 1), assigned_role);
  
  return new;
end;
$$ language plpgsql security definer;
