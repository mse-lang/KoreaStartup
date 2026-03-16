-- Add category field for content distribution
alter table public.articles add column if not exists category text default 'general';
-- Values: special-post, interview-news, startup-topic, guide-startups, announcement, general
