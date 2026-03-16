-- Add author_name column to articles table for storing journalist/reporter name
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS author_name text;
