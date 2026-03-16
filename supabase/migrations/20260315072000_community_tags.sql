-- Allow comments to be posted directly to a tag (community boards)
alter table public.comments add column if not exists tag_id uuid references public.tags(id) on delete cascade;

-- Allow anonymous comments on tags (same policies as article comments)
create policy "Anyone can read tag comments" on comments for select using (tag_id is not null);
create policy "Anyone can insert tag comments" on comments for insert with check (tag_id is not null);
