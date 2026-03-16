import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/UserMenu';
import TagNav from '@/components/TagNav';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch articles from the last 30 hours
  const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();

  const { data: allArticles } = await supabase
    .from('articles')
    .select('id, title, source_name, summary_5lines, og_image_url, category, published_at, created_at')
    .gte('created_at', thirtyHoursAgo)
    .order('created_at', { ascending: false })
    .limit(30);

  // Fallback if not enough recent articles
  let articles = allArticles ?? [];
  if (articles.length < 5) {
    const { data: fallback } = await supabase
      .from('articles')
      .select('id, title, source_name, summary_5lines, og_image_url, category, published_at, created_at')
      .order('created_at', { ascending: false })
      .limit(12);
    articles = fallback ?? [];
  }

  // Priority sort
  const priorityOrder: Record<string, number> = {
    'special-post': 0, 'interview-news': 1, 'startup-topic': 2,
    'guide-startups': 3, 'announcement': 4, 'general': 5,
  };
  articles.sort((a, b) => (priorityOrder[a.category] ?? 5) - (priorityOrder[b.category] ?? 5));

  // Split into 3 tiers: headline 1, sub 6, brief 5
  const headline = articles[0] ?? null;
  const subArticles = articles.slice(1, 7);   // 6 sub-articles
  const briefArticles = articles.slice(7, 12); // 5 brief articles

  // Get comment counts for each article (for fire emoji)
  const articleIds = articles.map(a => a.id);
  let commentCounts: Record<string, number> = {};
  if (articleIds.length > 0) {
    const { data: counts } = await supabase
      .from('comments')
      .select('article_id')
      .in('article_id', articleIds);
    if (counts) {
      for (const c of counts) {
        commentCounts[c.article_id] = (commentCounts[c.article_id] ?? 0) + 1;
      }
    }
  }

  // Fetch latest 10 comments
  const { data: latestComments } = await supabase
    .from('comments')
    .select('id, content, anonymous_name, user_id, is_blinded, created_at, article_id, articles(title)')
    .eq('is_blinded', false)
    .order('created_at', { ascending: false })
    .limit(10);

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      'special-post': '스페셜', 'interview-news': '인터뷰', 'startup-topic': '토픽',
      'guide-startups': '가이드', 'announcement': '공지', 'general': '일반',
    };
    return map[cat] ?? cat;
  };

  const fireEmoji = (articleId: string) => {
    const count = commentCounts[articleId] ?? 0;
    if (count === 0) return null;
    return <span className="text-xs" title={`댓글 ${count}개`}>{count >= 5 ? '🔥🔥' : '🔥'} {count}</span>;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-3">
        <Link href="/" className="text-xl sm:text-2xl font-bold tracking-tight hover:text-brand-primary transition-colors">
          KoreaStartup.kr
        </Link>
        <div className="flex gap-2 items-center flex-wrap">
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>

      {/* Tag Navigation */}
      <TagNav />

      {articles.length === 0 ? (
        <div className="bento-card p-12 flex flex-col items-center justify-center gap-4">
          <p className="text-5xl">📰</p>
          <h2 className="text-2xl font-bold">아직 등록된 기사가 없습니다</h2>
          <p className="text-slate-400 text-center max-w-md">크롤러를 실행하거나 기사를 직접 작성해 보세요.</p>
          {user && <Link href="/admin/articles/new" className="btn-primary mt-4">✏️ 첫 번째 기사 작성하기</Link>}
        </div>
      ) : (
        <>
          {/* === TIER 1: HEADLINE === */}
          {headline && (
            <Link
              href={`/article/${headline.id}`}
              className="bento-card p-0 flex flex-col md:flex-row overflow-hidden group hover:-translate-y-1 hover:border-brand-primary/50 transition-all duration-300 block"
            >
              {headline.og_image_url ? (
                <img
                  src={headline.og_image_url}
                  alt={headline.title}
                  className="w-full md:w-5/12 h-48 sm:h-56 md:h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full md:w-5/12 h-48 sm:h-56 md:h-auto bg-gradient-to-br from-brand-primary/30 to-slate-800 flex items-center justify-center text-5xl">📰</div>
              )}
              <div className="p-5 sm:p-8 flex flex-col justify-center gap-3 md:w-7/12">
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="px-2.5 py-0.5 bg-brand-primary text-white rounded-full text-xs font-bold">🔥 헤드라인</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-slate-400">{categoryLabel(headline.category)}</span>
                  {fireEmoji(headline.id)}
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight group-hover:text-brand-primary transition-colors">
                  {headline.title}
                </h2>
                {headline.summary_5lines && (
                  <p className="text-slate-300 line-clamp-2 sm:line-clamp-3 leading-relaxed text-sm sm:text-base">
                    {headline.summary_5lines.split('\n')[0]?.replace(/^\d+\.\s*/, '')}
                  </p>
                )}
                <span className="text-xs text-slate-500">{timeAgo(headline.created_at)} · {headline.source_name}</span>
              </div>
            </Link>
          )}

          {/* === TIER 2: SUB-ARTICLES (Bento Grid) === */}
          {subArticles.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-slate-100 pl-1 mb-4 flex items-center gap-2">
                <span className="text-brand-primary">■</span> 주요 기사
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.id}`}
                    className="bento-card p-0 flex flex-col overflow-hidden hover:-translate-y-2 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-brand-primary/40 transition-all duration-300 group block h-full"
                  >
                    {/* Image Area */}
                    <div className="relative h-44 sm:h-48 w-full overflow-hidden">
                      {article.og_image_url ? (
                        <img
                          src={article.og_image_url}
                          alt={article.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-4xl">📰</div>
                      )}
                      
                      {/* Gradient Overlay for Text Readability if we wanted text inside */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-60"></div>
                      
                      {/* Category Badge Floating */}
                      <div className="absolute top-3 left-3 flex gap-2">
                         <span className="px-2.5 py-1 backdrop-blur-md bg-black/40 border border-white/10 rounded-lg text-xs font-medium text-white shadow-sm">
                           {categoryLabel(article.category)}
                         </span>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-5 flex flex-col gap-3 flex-1 bg-white/[0.02]">
                      <h4 className="font-bold text-lg leading-snug group-hover:text-brand-primary transition-colors line-clamp-2 text-slate-100">
                        {article.title}
                      </h4>
                      
                      {/* AI Snippets Box */}
                      {article.summary_5lines && (
                        <div className="mt-2 text-sm text-slate-300 bg-black/20 rounded-xl p-3 border border-white/5 flex-1">
                          <ul className="list-disc pl-4 space-y-1.5 marker:text-brand-primary/60">
                            {article.summary_5lines.split('\n').filter(Boolean).slice(0, 3).map((line: string, i: number) => (
                               <li key={i} className="line-clamp-2 leading-relaxed text-xs sm:text-sm">
                                  {line.replace(/^\d+\.\s*/, '').replace(/\*+/g, '')}
                               </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-3 border-t border-white/5">
                        <span className="font-medium text-slate-400">{article.source_name}</span>
                        <div className="flex items-center gap-2">
                           {fireEmoji(article.id)}
                           <span>{timeAgo(article.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* === TIER 3: BRIEF / INFO (Bento List) === */}
          {briefArticles.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-slate-100 pl-1 mb-4 flex items-center gap-2">
                <span className="text-brand-success">⚡</span> 단신 · 속보
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {briefArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.id}`}
                    className="bento-card px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 hover:-translate-y-1 hover:border-brand-primary/30 transition-all duration-200 group block"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-slate-300 flex-shrink-0">
                        {categoryLabel(article.category)}
                      </span>
                      <h4 className="font-medium text-sm sm:text-base text-slate-200 group-hover:text-brand-primary transition-colors flex-1 line-clamp-1">
                        {article.title}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0 text-xs text-slate-500">
                      <span className="font-medium text-slate-400">{article.source_name}</span>
                      <div className="flex items-center gap-2">
                         {fireEmoji(article.id)}
                         <span>{timeAgo(article.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* === LATEST COMMENTS FEED === */}
          {latestComments && latestComments.length > 0 && (
            <section className="mt-2">
              <h3 className="text-base font-bold text-slate-300 mb-3">💬 최신 댓글</h3>
              <div className="bento-card p-0 divide-y divide-white/5 overflow-hidden">
                {latestComments.map((comment: any) => {
                  const articleTitle = Array.isArray(comment.articles)
                    ? comment.articles[0]?.title
                    : comment.articles?.title ?? '기사';
                  return (
                    <Link
                      key={comment.id}
                      href={`/article/${comment.article_id}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors block"
                    >
                      <span className="flex-shrink-0 text-sm mt-0.5">
                        {comment.user_id ? '👤' : '🎭'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 line-clamp-1">{comment.content}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {comment.anonymous_name ?? '회원'} · {articleTitle} · {timeAgo(comment.created_at)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="mt-4 py-4 border-t border-white/5 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} KoreaStartup.kr — 한국 스타트업 뉴스 큐레이션
      </footer>
    </div>
  );
}
