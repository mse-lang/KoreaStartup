-- 1. Add fields to articles table
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create author_profiles table
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
CREATE POLICY "Users can view their own profile" ON public.author_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.author_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.author_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'editor'))
);

-- 3. Create revenue_shares table
CREATE TABLE IF NOT EXISTS public.revenue_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_key text NOT NULL,                    -- Toss payment key
  total_amount numeric NOT NULL,                -- amount paid by buyer
  author_share numeric NOT NULL,                -- 40% of total_amount
  platform_share numeric NOT NULL,              -- 60% of total_amount
  status text DEFAULT 'pending',                -- 'pending', 'settled'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.revenue_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can view their own revenue" ON public.revenue_shares FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admins can view all revenue" ON public.revenue_shares FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'editor'))
);
