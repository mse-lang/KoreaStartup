-- Make article_id nullable so tag-based community comments can be posted without an article
ALTER TABLE public.comments ALTER COLUMN article_id DROP NOT NULL;
