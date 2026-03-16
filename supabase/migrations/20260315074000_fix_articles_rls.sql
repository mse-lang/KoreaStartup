-- Allow the crawler to insert articles without user authentication
-- The API route itself handles auth checks; RLS should not block server-side inserts
create policy "Allow insert articles" on articles for insert with check (true);
create policy "Allow update articles" on articles for update using (true);
