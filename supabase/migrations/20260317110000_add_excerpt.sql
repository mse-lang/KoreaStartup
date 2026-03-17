-- Add excerpt column for RSS description / manual summary
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS excerpt text DEFAULT NULL;
