-- Add description field to tags
alter table public.tags add column if not exists description text;
