-- RSS source management table
CREATE TABLE IF NOT EXISTS public.rss_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,              -- e.g. 'special-post'
  feed_url text NOT NULL UNIQUE,   -- RSS feed URL
  label text NOT NULL,             -- display label e.g. '스페셜포스트'
  source_name text NOT NULL,       -- media name e.g. '벤처스퀘어'
  max_articles int DEFAULT 5,      -- max articles per crawl
  is_active boolean DEFAULT true,  -- enable/disable
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Allow public read, admin write
ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sources" ON rss_sources FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sources" ON rss_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sources" ON rss_sources FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sources" ON rss_sources FOR DELETE USING (true);

-- Seed initial sources from current hardcoded list
INSERT INTO public.rss_sources (name, feed_url, label, source_name, max_articles) VALUES
  ('special-post',   'https://www.venturesquare.net/category/special-post/feed/',   '스페셜포스트', '벤처스퀘어', 5),
  ('interview-news', 'https://www.venturesquare.net/category/interview-news/feed/', '인터뷰',       '벤처스퀘어', 4),
  ('startup-topic',  'https://www.venturesquare.net/startup-topic/feed/',           '스타트업토픽', '벤처스퀘어', 3),
  ('guide-startups', 'https://www.venturesquare.net/category/guide/startups/feed/', '가이드',       '벤처스퀘어', 3),
  ('announcement',   'https://www.venturesquare.net/announcement/feed/',            '공지',         '벤처스퀘어', 2),
  ('platum-news',    'https://platum.kr/feed',                                      '플래텀',       '플래텀',     12),
  ('eo-planet',      'https://eopla.net/feed',                                      'EO플래닛',     'EO',         8),
  ('news1-it',       'https://www.news1.kr/rss/it',                                 'IT뉴스',       '뉴스1',      8),
  ('etnews-startup', 'https://rss.etnews.com/Section901.xml',                       'ET스타트업',   '전자신문',   8)
ON CONFLICT (feed_url) DO NOTHING;
