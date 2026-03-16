-- Tags system: auto-generated tags with many-to-many relationship to articles

create table public.tags (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,       -- e.g. 'AI', '로보틱스', '투자'
  slug text unique not null,       -- URL-safe: 'ai', 'robotics', 'investment'
  article_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Junction table
create table public.article_tags (
  article_id uuid references public.articles(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  primary key (article_id, tag_id)
);

alter table public.tags enable row level security;
alter table public.article_tags enable row level security;

-- Everyone can view tags
create policy "Tags are viewable by everyone." on tags for select using (true);
create policy "Article tags are viewable by everyone." on article_tags for select using (true);

-- Admins can manage tags
create policy "Admins can manage tags." on tags for all using (
  public.get_user_role() in ('super_admin'::user_role, 'editor'::user_role)
);
create policy "Admins can manage article_tags." on article_tags for all using (
  public.get_user_role() in ('super_admin'::user_role, 'editor'::user_role)
);
