-- Add threaded reply support (up to 3 levels deep)
alter table public.comments add column parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column depth integer default 0 check (depth >= 0 and depth <= 2);
-- depth 0 = top-level, 1 = reply, 2 = reply-to-reply (3rd level, max)
