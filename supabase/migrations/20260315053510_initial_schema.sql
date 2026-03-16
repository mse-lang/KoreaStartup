-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Custom Types
create type user_role as enum ('super_admin', 'editor', 'expert', 'user');
create type feedback_tag as enum ('Additional Info', 'Debate', 'Counter-argument', 'Fact-check', 'General');
create type payment_status as enum ('PENDING', 'DONE', 'CANCELED');
create type settlement_status as enum ('PENDING', 'PAID');

-- 2. Profiles Table (Extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role user_role default 'user'::user_role not null,
  nickname text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Profile Policies
create policy "Public profiles are viewable by everyone."
  on profiles for select using ( true );

create policy "Users can insert their own profile."
  on profiles for insert with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update using ( auth.uid() = id );

create policy "Super admins can manage all profiles."
  on profiles for all using ( 
    exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'::user_role)
  );

-- 3. Articles Table
create table public.articles (
  id uuid default gen_random_uuid() primary key,
  source_url text unique not null,
  source_name text not null, -- 'VentureSquare', 'K-Startup', 'Nara Market', etc.
  title text not null,
  content_raw text not null, -- Markdown extracted via Jina Reader
  summary_5lines text,       -- gemini-3.1-flash-lite-preview Summary
  og_image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  published_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.articles enable row level security;

create policy "Articles are viewable by everyone."
  on articles for select using ( true );

create policy "Super admins and editors can manage articles."
  on articles for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('super_admin'::user_role, 'editor'::user_role))
  );

-- 4. Community Feedback Table
create table public.community_feedback (
  id uuid default gen_random_uuid() primary key,
  article_id uuid references public.articles(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  tag feedback_tag not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.community_feedback enable row level security;

create policy "Feedback is viewable by everyone."
  on community_feedback for select using ( true );

create policy "Users can create feedback."
  on community_feedback for insert with check ( auth.uid() = user_id );

create policy "Users can update their own feedback."
  on community_feedback for update using ( auth.uid() = user_id );

create policy "Users can delete their own feedback."
  on community_feedback for delete using ( auth.uid() = user_id );

create policy "Super admins and editors can manage all feedback."
  on community_feedback for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('super_admin'::user_role, 'editor'::user_role))
  );

-- 5. Payments Table (Toss Payments)
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete restrict not null,
  amount numeric not null check (amount > 0),
  toss_order_id text unique not null,
  toss_payment_key text,
  status payment_status default 'PENDING'::payment_status not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payments enable row level security;

create policy "Users can view their own payments."
  on payments for select using ( auth.uid() = user_id );

create policy "Super admins can manage all payments."
  on payments for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'::user_role)
  );

-- 6. Settlements Table (for Experts)
create table public.settlements (
  id uuid default gen_random_uuid() primary key,
  expert_id uuid references public.profiles(id) on delete restrict not null,
  month text not null, -- Format: 'YYYY-MM'
  total_revenue numeric not null default 0,
  platform_fee numeric not null default 0, -- 20%
  net_payout numeric not null default 0,
  status settlement_status default 'PENDING'::settlement_status not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (expert_id, month)
);

alter table public.settlements enable row level security;

create policy "Experts can view their own settlements."
  on settlements for select using ( auth.uid() = expert_id );

create policy "Super admins can manage all settlements."
  on settlements for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'super_admin'::user_role)
  );

-- 7. Functions & Triggers
-- Function to automatically handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to all tables
create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_articles
  before update on public.articles
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_feedback
  before update on public.community_feedback
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_payments
  before update on public.payments
  for each row execute function public.handle_updated_at();

create trigger handle_updated_at_settlements
  before update on public.settlements
  for each row execute function public.handle_updated_at();

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
