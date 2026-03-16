-- Comments table: supports both anonymous and authenticated users
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  article_id uuid references public.articles(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,  -- NULL for anonymous
  anonymous_name text,     -- e.g. "익명_a3f8"
  anonymous_ip text,       -- masked IP like "192.168.xx.xx"
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.comments enable row level security;

-- Everyone can read comments
create policy "Comments are viewable by everyone."
  on comments for select using ( true );

-- Authenticated users can insert comments
create policy "Authenticated users can create comments."
  on comments for insert with check ( auth.uid() = user_id );

-- Anonymous comments (user_id is null) can be inserted by anyone
create policy "Anonymous comments can be created."
  on comments for insert with check ( user_id is null );

-- Users can delete their own comments
create policy "Users can delete their own comments."
  on comments for delete using ( auth.uid() = user_id );

-- Admins can manage all comments
create policy "Admins can manage all comments."
  on comments for all using (
    public.get_user_role() in ('super_admin'::user_role, 'editor'::user_role)
  );
