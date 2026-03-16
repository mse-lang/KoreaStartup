-- Phase 1+2 Schema: Bookmarks, View Counts, Newsletter Subscribers

-- 1. Bookmarks table
create table if not exists public.bookmarks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    article_id uuid references public.articles(id) on delete cascade not null,
    created_at timestamptz default now(),
    unique(user_id, article_id)
);

alter table public.bookmarks enable row level security;

create policy "Users can manage own bookmarks"
    on public.bookmarks for all
    using (auth.uid() = user_id);

-- 2. View count column on articles
alter table public.articles add column if not exists view_count integer default 0;
alter table public.articles add column if not exists slug text;

-- 3. RPC function for atomic view count increment
create or replace function increment_view_count(article_id uuid)
returns void as $$
begin
    update public.articles
    set view_count = coalesce(view_count, 0) + 1
    where id = article_id;
end;
$$ language plpgsql security definer;

-- 4. Newsletter subscribers
create table if not exists public.newsletter_subscribers (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    subscribed_at timestamptz default now(),
    is_active boolean default true
);

alter table public.newsletter_subscribers enable row level security;

-- Allow inserts from authenticated or anon users (for newsletter signup)
create policy "Anyone can subscribe to newsletter"
    on public.newsletter_subscribers for insert
    with check (true);
