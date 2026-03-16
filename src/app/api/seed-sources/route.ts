import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Allow localhost or super_admin
  const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
  
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'super_admin') isAdmin = true;
  }

  if (!isLocal && !isAdmin) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  const initialSources = [
    { name: 'special-post',  feed_url: 'https://www.venturesquare.net/category/special-post/feed/',   label: '스페셜포스트', source_name: '벤처스퀘어', max_articles: 4 },
    { name: 'interview-news',feed_url: 'https://www.venturesquare.net/category/interview-news/feed/', label: '인터뷰',       source_name: '벤처스퀘어', max_articles: 3 },
    { name: 'startup-topic', feed_url: 'https://www.venturesquare.net/startup-topic/feed/',           label: '스타트업토픽', source_name: '벤처스퀘어', max_articles: 3 },
    { name: 'hankyung-it',   feed_url: 'https://rss.hankyung.com/new/news_it.xml',                    label: '한국경제IT',   source_name: '한국경제',   max_articles: 5 },
    { name: 'mk-it',         feed_url: 'https://www.mk.co.kr/rss/50300009/',                          label: '매경IT',       source_name: '매일경제',   max_articles: 5 },
    { name: 'etnews-startup',feed_url: 'https://rss.etnews.com/Section901.xml',                       label: '전자신문벤처', source_name: '전자신문',   max_articles: 5 },
    { name: 'fnnews-it',     feed_url: 'https://www.fnnews.com/rss/new/fn_realnews_it.xml',           label: '파이낸셜IT',   source_name: '파이낸셜뉴스', max_articles: 5 },
    { name: 'chosunbiz-it',  feed_url: 'https://biz.chosun.com/site/data/rss/it.xml',                 label: '조선비즈IT',   source_name: '조선비즈',   max_articles: 5 },
    { name: 'eo-planet',     feed_url: 'https://eopla.net/feed',                                      label: 'EO플래닛',     source_name: 'EO',         max_articles: 5 },
  ];

  let addedCount = 0;
  let errorCount = 0;

  for (const source of initialSources) {
    const { error } = await supabase
      .from('rss_sources')
      .upsert({ ...source, is_active: true }, { onConflict: 'feed_url' });
      
    if (error) {
      console.error('Failed to seed source:', source.name, error);
      errorCount++;
    } else {
      addedCount++;
    }
  }

  return NextResponse.json({
    message: 'Seeding complete',
    added_or_updated: addedCount,
    errors: errorCount,
  });
}
