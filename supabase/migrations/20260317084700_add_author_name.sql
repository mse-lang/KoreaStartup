-- Add author_name column to articles table for storing journalist/reporter name
-- Uses IF NOT EXISTS for safety
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'articles') THEN
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_name text;
  END IF;
END $$;
