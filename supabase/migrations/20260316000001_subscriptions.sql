-- Table for tracking user subscriptions manually via Toss Payments
create table public.user_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    status text not null check (status in ('active', 'expired')),
    payment_key text,
    order_id text,
    amount numeric,
    expires_at timestamptz not null,
    created_at timestamptz default now()
);

-- RLS policies
alter table public.user_subscriptions enable row level security;

-- Users can read their own subscriptions
create policy "Users can view own subscriptions"
    on public.user_subscriptions for select
    using (auth.uid() = user_id);

-- Only service role can insert/update (or authenticated trigger via backend API)
