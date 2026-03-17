-- ============================================================
-- KoreaStartup.kr — Full Database Setup (Fresh Install)
-- Consolidated from 20 migration files
-- Run this in Supabase SQL Editor on a fresh project
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CUSTOM TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'editor', 'expert', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_tag AS ENUM ('Additional Info', 'Debate', 'Counter-argument', 'Fact-check', 'General');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'DONE', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM ('PENDING', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. PROFILES TABLE (Extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  nickname text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 3. HELPER FUNCTION (avoid RLS recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Super admins can manage all profiles."
  ON profiles FOR ALL USING (
    public.get_user_role() = 'super_admin'::user_role
  );

-- ============================================================
-- 4. ARTICLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url text UNIQUE NOT NULL,
  source_name text NOT NULL,
  title text NOT NULL,
  content_raw text NOT NULL,
  summary_5lines text,
  og_image_url text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,                    -- journalist/reporter name from RSS
  published_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  -- Extra columns
  category text DEFAULT 'general',     -- special-post, interview-news, etc.
  is_premium boolean DEFAULT false,
  price numeric DEFAULT 0,
  free_until timestamptz DEFAULT NULL,
  view_count integer DEFAULT 0,
  slug text,
  excerpt text                         -- RSS description / manual excerpt for cards
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Articles are viewable by everyone."
  ON articles FOR SELECT USING (true);
CREATE POLICY "Allow insert articles"
  ON articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update articles"
  ON articles FOR UPDATE USING (true);
CREATE POLICY "Super admins and editors can manage articles."
  ON articles FOR ALL USING (
    public.get_user_role() IN ('super_admin'::user_role, 'editor'::user_role)
  );

-- ============================================================
-- 5. TAGS SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  article_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (article_id, tag_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by everyone." ON tags FOR SELECT USING (true);
CREATE POLICY "Article tags are viewable by everyone." ON article_tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage tags." ON tags FOR ALL USING (
  public.get_user_role() IN ('super_admin'::user_role, 'editor'::user_role)
);
CREATE POLICY "Admins can manage article_tags." ON article_tags FOR ALL USING (
  public.get_user_role() IN ('super_admin'::user_role, 'editor'::user_role)
);
-- Allow anyone to insert tags/article_tags (for free tagging feature)
CREATE POLICY "Anyone can insert tags" ON tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tags" ON tags FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert article_tags" ON article_tags FOR INSERT WITH CHECK (true);

-- ============================================================
-- 6. COMMENTS TABLE (anonymous + authenticated, threaded)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE,  -- nullable for tag comments
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,          -- for community board comments
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  anonymous_name text,
  anonymous_ip text,
  content text NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  depth integer DEFAULT 0 CHECK (depth >= 0 AND depth <= 2),
  is_blinded boolean DEFAULT false,
  blind_reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all comment reads" ON comments FOR SELECT USING (true);
CREATE POLICY "Allow all comment inserts" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete their own comments."
  ON comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all comments."
  ON comments FOR ALL USING (
    public.get_user_role() IN ('super_admin'::user_role, 'editor'::user_role)
  );

-- ============================================================
-- 7. COMMUNITY FEEDBACK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tag feedback_tag NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback is viewable by everyone."
  ON community_feedback FOR SELECT USING (true);
CREATE POLICY "Users can create feedback."
  ON community_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own feedback."
  ON community_feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own feedback."
  ON community_feedback FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Super admins and editors can manage all feedback."
  ON community_feedback FOR ALL USING (
    public.get_user_role() IN ('super_admin'::user_role, 'editor'::user_role)
  );

-- ============================================================
-- 8. PAYMENTS TABLE (Toss Payments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  toss_order_id text UNIQUE NOT NULL,
  toss_payment_key text,
  status payment_status DEFAULT 'PENDING'::payment_status NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments."
  ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all payments."
  ON payments FOR ALL USING (
    public.get_user_role() = 'super_admin'::user_role
  );

-- ============================================================
-- 9. SETTLEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  month text NOT NULL,
  total_revenue numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_payout numeric NOT NULL DEFAULT 0,
  status settlement_status DEFAULT 'PENDING'::settlement_status NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (expert_id, month)
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can view their own settlements."
  ON settlements FOR SELECT USING (auth.uid() = expert_id);
CREATE POLICY "Super admins can manage all settlements."
  ON settlements FOR ALL USING (
    public.get_user_role() = 'super_admin'::user_role
  );

-- ============================================================
-- 10. USER SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'expired')),
  payment_key text,
  order_id text,
  amount numeric,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 11. RSS SOURCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rss_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  feed_url text NOT NULL UNIQUE,
  label text NOT NULL,
  source_name text NOT NULL,
  max_articles int DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sources" ON rss_sources FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sources" ON rss_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sources" ON rss_sources FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sources" ON rss_sources FOR DELETE USING (true);

-- ============================================================
-- 12. AUTHOR PROFILES & REVENUE SHARES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.author_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  is_verified boolean DEFAULT false,
  bank_name text,
  account_number text,
  account_holder text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own author profile" ON public.author_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own author profile" ON public.author_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own author profile" ON public.author_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all author profiles" ON public.author_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'editor'))
);

CREATE TABLE IF NOT EXISTS public.revenue_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_key text NOT NULL,
  total_amount numeric NOT NULL,
  author_share numeric NOT NULL,
  platform_share numeric NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.revenue_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their own revenue" ON public.revenue_shares FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admins can view all revenue" ON public.revenue_shares FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'editor'))
);

-- ============================================================
-- 13. BOOKMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, article_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks"
  ON public.bookmarks FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 14. NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  subscribed_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 15. FUNCTIONS & TRIGGERS
-- ============================================================

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_articles
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_feedback
  BEFORE UPDATE ON public.community_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_payments
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_settlements
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup (RBAC enforced)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role public.user_role;
BEGIN
  IF NEW.email IN ('mse@venturesquare.net', 'admin@venturesquare.net') THEN
    assigned_role := 'super_admin'::public.user_role;
  ELSIF NEW.email = 'editor@venturesquare.net' THEN
    assigned_role := 'editor'::public.user_role;
  ELSE
    assigned_role := 'user'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, nickname, role)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), assigned_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC function for atomic view count increment
CREATE OR REPLACE FUNCTION increment_view_count(article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 16. SEED DATA: RSS Sources
-- ============================================================
INSERT INTO public.rss_sources (name, feed_url, label, source_name, max_articles) VALUES
  ('special-post',   'https://www.venturesquare.net/category/special-post/feed/',   '스페셜포스트', '벤처스퀘어', 5),
  ('interview-news', 'https://www.venturesquare.net/category/interview-news/feed/', '인터뷰',       '벤처스퀘어', 4),
  ('startup-topic',  'https://www.venturesquare.net/startup-topic/feed/',           '스타트업토픽', '벤처스퀘어', 3),
  ('guide-startups', 'https://www.venturesquare.net/category/guide/startups/feed/', '가이드',       '벤처스퀘어', 3),
  ('announcement',   'https://www.venturesquare.net/announcement/feed/',            '공지',         '벤처스퀘어', 2),
  ('platum-news',    'https://platum.kr/feed',                                      '플래텀',       '플래텀',     12),
  ('eo-planet',      'https://eopla.net/feed',                                      'EO플래닛',     'EO',         8),
  ('news1-it',       'https://www.news1.kr/rss/it',                                 'IT뉴스',       '뉴스1',      8),
  ('etnews-startup', 'https://rss.etnews.com/Section901.xml',                       'ET스타트업',   '전자신문',   8),
  ('itdonga',        'https://it.donga.com/feeds/rss/',                              'IT동아',       'IT동아',     3),
  ('zdnet-korea',    'http://feeds.feedburner.com/zdkorea',                          'ZDNet',        'ZDNet Korea', 3),
  ('geeknews',       'https://news.hada.io/rss/news',                               '긱뉴스',       'GeekNews',   3),
  ('bloter',         'http://feeds.feedburner.com/Bloter',                           '블로터',       '블로터',     3)
ON CONFLICT (feed_url) DO NOTHING;

-- ============================================================
-- 17. SEED DATA: Community Tags
-- ============================================================
INSERT INTO public.tags (name, slug, description, article_count)
VALUES
  ('💎 프리미엄', 'premium', '유료 구독자 전용 프리미엄 콘텐츠입니다.

깊이 있는 분석 리포트, 독점 인터뷰, 투자 데이터 등 고급 정보를 제공합니다.

스타트업 창업자와 투자자에게 경쟁력 있는 인사이트를 전달합니다.', 0),
  ('🌟 오리지널', 'original', '코리아스타트업 크리에이터가 직접 작성하고 발행하는 독점 프리미엄 콘텐츠입니다.

스타트업 생태계에 대한 깊이 있는 분석과 인사이트를 제공합니다.', 0),
  ('🤔 창업고민', 'startup-worries', '창업 과정에서 겪는 고민, 질문, 경험담을 자유롭게 나누는 공간입니다.

사업 아이디어 검증, 팀 빌딩, 법인 설립, 투자 유치 등 다양한 주제에 대해 선배 창업자들의 조언을 얻을 수 있습니다.

막막한 창업의 길에서 서로 도움을 주고받으며 함께 성장해 나갑니다.', 0),
  ('👔 CEO토크', 'ceo-talk', 'CEO와 대표이사들이 경영 노하우, 리더십, 의사결정 과정을 공유하는 공간입니다.

조직 관리, 비전 수립, 위기 대응, 이사회 운영 등 최고경영자만이 겪는 고유한 경험들을 나눕니다.

동료 CEO들과의 솔직한 대화를 통해 더 나은 경영 인사이트를 얻으세요.', 0),
  ('💰 투자자토크', 'investor-talk', '엔젤투자자, VC, 기관투자자들이 투자 관점과 인사이트를 공유하는 공간입니다.

딜소싱, 기업 가치평가, 투자 계약 조건, 포트폴리오 관리 등 투자 실무 경험을 나눕니다.

스타트업 투자 생태계의 건전한 발전을 위해 투명하고 건설적인 토론을 지향합니다.', 0),
  ('📋 창업지원', 'startup-support', '정부·지자체·공공기관의 창업 지원 사업, 보조금, 사업화 프로그램 정보를 공유하는 공간입니다.

중소벤처기업부, 창업진흥원, 각 지역 창조경제혁신센터 등의 지원 프로그램을 소개하고 경험을 나눕니다.

지원 사업 신청 팁, 합격 후기, 사업계획서 작성법 등 실질적인 정보를 교환할 수 있습니다.', 0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ============================================================
-- DONE! All tables, policies, triggers, and seed data are set up.
-- ============================================================
