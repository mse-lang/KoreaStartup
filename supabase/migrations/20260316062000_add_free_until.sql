-- Add free_until column to enable 1-day free premium articles
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS free_until timestamptz DEFAULT NULL;
