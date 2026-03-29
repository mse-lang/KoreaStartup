import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/UserMenu';
import TagNav from '@/components/TagNav';
import NewsletterSignup from '@/components/NewsletterSignup';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // === HERO 후보: 벤처스퀘어 interview-news + special-post, 썸네일 필수 ===
  const { data: vsHeroRaw } = await supabase
    .from('articles')
    .select('id, title, source_name, summary_5lines, excerpt, og_image_url, category, published_at, created_at, source_url')
    .eq('source_name', '벤처스퀘어')
    .in('category', ['interview-news', 'special-post'])
    .not('og_image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // === 그리드용: 타 매체 interview-news 카테고리, 썸네일 필수, 긱뉴스 제외 ===
  const { data: nonVSRaw } = await supabase
    .from('articles')
    .select('id, title, source_name, summary_5lines, excerpt, og_image_url, category, published_at, created_at, source_url')
    .neq('source_name', '벤처스퀘어')
    .neq('source_name', 'GeekNews')
    .eq('category', 'interview-news')
    .not('og_image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // 그리드 나머지용: 벤처스퀘어 interview+special, 썸네일 필수 (hero 제외)
  const vsHeroArticles = vsHeroRaw ?? [];
  const nonVSInterviewArticles = nonVSRaw ?? [];

  let featuredArticles = [...vsHeroArticles, ...nonVSInterviewArticles.filter(a => !vsHeroArticles.find(v => v.id === a.id))];

  // === SECONDARY: 나머지 카테고리 최신 20개 ===
  const { data: briefRaw } = await supabase
    .from('articles')
    .select('id, title, source_name, summary_5lines, excerpt, og_image_url, category, published_at, created_at, source_url')
    .not('category', 'in', `(${FEATURED_CATEGORIES.map(c => `"${c}"`).join(',')})`)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fallback: if no brief articles, pull all
  let briefArticles = briefRaw ?? [];
  if (briefArticles.length === 0) {
    const { data: briefFallback } = await supabase
      .from('articles')
      .select('id, title, source_name, summary_5lines, excerpt, og_image_url, category, published_at, created_at, source_url')
      .order('created_at', { ascending: false })
      .limit(20);
    briefArticles = (briefFallback ?? []).filter(a => !featuredArticles.find(f => f.id === a.id));
  }

  // Hero: 벤처스퀘어 interview-news 우선, 없으면 special-post
  const heroArticle =
    vsHeroArticles.find(a => a.category === 'interview-news') ??
    vsHeroArticles.find(a => a.category === 'special-post') ??
    vsHeroArticles[0] ??
    null;

  // Grid 앞 2개: 타 매체 interview-news, 각각 다른 매체
  const pickedNonVS: typeof nonVSInterviewArticles = [];
  const usedSources = new Set<string>();
  for (const a of nonVSInterviewArticles) {
    if (!usedSources.has(a.source_name)) {
      pickedNonVS.push(a);
      usedSources.add(a.source_name);
    }
    if (pickedNonVS.length >= 2) break;
  }

  // Grid 나머지: 벤처스퀘어 interview+special (hero 제외)
  const vsGridArticles = vsHeroArticles.filter(a => a.id !== heroArticle?.id);
  const remainingNonVS = nonVSInterviewArticles.filter(a => !pickedNonVS.find(p => p.id === a.id));

  const gridArticles = [
    ...pickedNonVS,
    ...vsGridArticles,
    ...remainingNonVS,
  ].slice(0, 6);

  // Get comment counts
  const allIds = [...featuredArticles, ...briefArticles].map(a => a.id);
  let commentCounts: Record<string, number> = {};
  if (allIds.length > 0) {
    const { data: counts } = await supabase
      .from('comments')
      .select('article_id')
      .in('article_id', allIds);
    if (counts) {
      for (const c of counts) {
        commentCounts[c.article_id] = (commentCounts[c.article_id] ?? 0) + 1;
      }
    }
  }

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      'special-post': '스페셜', 'interview-news': '인터뷰', 'startup-topic': '토픽',
      'guide-startups': '가이드', 'announcement': '공지', 'general': '일반',
    };
    return map[cat] ?? cat;
  };

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      'interview-news': 'bg-purple-600/80 text-purple-100',
      'special-post': 'bg-amber-600/80 text-amber-100',
      'guide-startups': 'bg-emerald-600/80 text-emerald-100',
      'startup-topic': 'bg-blue-600/80 text-blue-100',
      'announcement': 'bg-slate-600/80 text-slate-100',
      'general': 'bg-slate-700/80 text-slate-200',
    };
    return map[cat] ?? 'bg-slate-700/80 text-slate-200';
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

  const hasAnyContent = featuredArticles.length > 0 || briefArticles.length > 0;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-3">
        <Link href="/" className="text-xl sm:text-2xl font-bold tracking-tight hover:text-brand-primary transition-colors">
          KoreaStartup.kr
        </Link>
        <div className="flex gap-2 items-center flex-wrap">
          <Link href="/briefing" className="px-3 py-1.5 rounded-full text-xs font-medium bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 transition-colors">
            🤖 AI 브리핑
          </Link>
          <Link href="/bookmarks" className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-slate-400 hover:bg-white/10 transition-colors">
            📑 스크랩
          </Link>
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>

      {/* Tag Navigation */}
      <TagNav />

      {!hasAnyContent ? (
        <div className="bento-card p-12 flex flex-col items-center justify-center gap-4">
          <p className="text-5xl">📰</p>
          <h2 className="text-2xl font-bold">아직 등록된 기사가 없습니다</h2>
          <p className="text-slate-400 text-center max-w-md">크롤러를 실행하거나 기사를 직접 작성해 보세요.</p>
          {user && <Link href="/admin/articles/new" className="btn-primary mt-4">✏️ 첫 번째 기사 작성하기</Link>}
        </div>
      ) : (
        <>
          {/* ===== BENTO GRID ===== */}
          {(heroArticle || gridArticles.length > 0) && (
            <section aria-label="주요 기사" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[280px] gap-4">

              {/* ── HERO: 2col × 2row ── */}
              {heroArticle && (
                <Link
                  href={`/article/${heroArticle.id}`}
                  className="relative block overflow-hidden rounded-2xl group md:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[320px] lg:min-h-0"
                >
                  {heroArticle.og_image_url ? (
                    <img
                      src={heroArticle.og_image_url}
                      alt={heroArticle.title}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-slate-900 to-slate-800" />
                  )}
                  {/* Dark gradient overlay — bottom 60% only for text readability */}
                  <div className="absolute inset-0 card-overlay bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  {/* Glassmorphism content */}
                  <div className="relative z-10 flex flex-col justify-end h-full p-5 sm:p-8">
                    <div className="flex gap-2 items-center mb-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${categoryColor(heroArticle.category)}`}>
                        {categoryLabel(heroArticle.category)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm border border-white/10">
                        🔥 FEATURED
                      </span>
                      {fireEmoji(heroArticle.id)}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3 group-hover:text-brand-primary transition-colors">
                      {heroArticle.title}
                    </h2>
                    {(heroArticle.excerpt || heroArticle.summary_5lines) && (
                      <p className="text-white/70 text-sm line-clamp-2 mb-3">
                        {heroArticle.excerpt || heroArticle.summary_5lines?.split('\n')[0]?.replace(/^\d+\.\s*/, '')}
                      </p>
                    )}
                    <span className="text-white/50 text-xs">
                      {timeAgo(heroArticle.created_at)}
                    </span>
                  </div>
                </Link>
              )}

              {/* ── CARD 0: 2col wide — right-top of hero ── */}
              {gridArticles[0] && (
                <Link
                  href={`/article/${gridArticles[0].id}`}
                  className="bento-card relative overflow-hidden group block lg:col-span-2 min-h-[200px] lg:min-h-0 hover:-translate-y-1 hover:shadow-2xl hover:border-brand-primary/40 transition-all duration-300"
                >
                  {gridArticles[0].og_image_url ? (
                    <>
                      <img
                        src={gridArticles[0].og_image_url}
                        alt={gridArticles[0].title}
                        className="absolute inset-0 w-full h-full object-cover object-top opacity-60 group-hover:opacity-70 transition-opacity duration-300"
                      />
                      <div className="absolute inset-0 card-overlay bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 to-slate-900/90" />
                  )}
                  <div className="relative z-10 p-5 h-full flex flex-col justify-end">
                    <span className={`self-start mb-2 px-2.5 py-0.5 rounded-lg text-xs font-bold ${categoryColor(gridArticles[0].category)}`}>
                      {categoryLabel(gridArticles[0].category)}
                    </span>
                    <h3 className="font-bold text-lg sm:text-xl leading-snug text-slate-100 group-hover:text-brand-primary transition-colors line-clamp-2 mb-2">
                      {gridArticles[0].title}
                    </h3>
                    {(gridArticles[0].excerpt || gridArticles[0].summary_5lines) && (
                      <p className="text-slate-400 text-sm line-clamp-1 mb-2">
                        {gridArticles[0].excerpt || gridArticles[0].summary_5lines?.split('\n')[0]?.replace(/^\d+\.\s*/, '')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{timeAgo(gridArticles[0].created_at)}</span>
                      {fireEmoji(gridArticles[0].id)}
                    </div>
                  </div>
                </Link>
              )}

              {/* ── CARDS 1 & 2: small — right-bottom of hero ── */}
              {[gridArticles[1], gridArticles[2]].filter(Boolean).map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="bento-card relative overflow-hidden group block min-h-[160px] lg:min-h-0 hover:-translate-y-1 hover:shadow-xl hover:border-brand-primary/40 transition-all duration-300"
                >
                  {article.og_image_url ? (
                    <>
                      <img
                        src={article.og_image_url}
                        alt={article.title}
                        className="absolute inset-0 w-full h-full object-cover object-top opacity-55 group-hover:opacity-65 transition-opacity duration-300"
                      />
                      <div className="absolute inset-0 card-overlay bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/60 to-slate-900/80" />
                  )}
                  <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                    <span className={`self-start px-2 py-0.5 rounded text-xs font-bold ${categoryColor(article.category)}`}>
                      {categoryLabel(article.category)}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm leading-snug text-slate-100 group-hover:text-brand-primary transition-colors line-clamp-3 mb-2">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{timeAgo(article.created_at)}</span>
                        {fireEmoji(article.id)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* ── CARDS 3 & 4: standard — third row ── */}
              {[gridArticles[3], gridArticles[4]].filter(Boolean).map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="bento-card relative overflow-hidden group block min-h-[200px] lg:min-h-0 hover:-translate-y-1 hover:shadow-xl hover:border-brand-primary/40 transition-all duration-300"
                >
                  {article.og_image_url ? (
                    <>
                      <img
                        src={article.og_image_url}
                        alt={article.title}
                        className="absolute inset-0 w-full h-full object-cover object-top opacity-60 group-hover:opacity-70 transition-opacity duration-300"
                      />
                      <div className="absolute inset-0 card-overlay bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 to-slate-900/90">
                      <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-20">
                        {article.category === 'interview-news' ? '🎙️' : '📖'}
                      </div>
                    </div>
                  )}
                  <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                    <span className={`self-start px-2.5 py-0.5 rounded-lg text-xs font-bold backdrop-blur-sm ${categoryColor(article.category)}`}>
                      {categoryLabel(article.category)}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base leading-snug text-slate-100 group-hover:text-brand-primary transition-colors line-clamp-3 mb-2">
                        {article.title}
                      </h3>
                      {(article.excerpt || article.summary_5lines) && (
                        <p className="text-slate-500 text-xs line-clamp-1 mb-1.5">
                          {article.excerpt || article.summary_5lines?.split('\n')[0]?.replace(/^\d+\.\s*/, '')}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{timeAgo(article.created_at)}</span>
                        {fireEmoji(article.id)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* ── CARD 5: 2col wide — third row end ── */}
              {gridArticles[5] && (
                <Link
                  href={`/article/${gridArticles[5].id}`}
                  className="bento-card relative overflow-hidden group block md:col-span-2 lg:col-span-2 min-h-[200px] lg:min-h-0 hover:-translate-y-1 hover:shadow-2xl hover:border-brand-primary/40 transition-all duration-300"
                >
                  {gridArticles[5].og_image_url ? (
                    <>
                      <img
                        src={gridArticles[5].og_image_url}
                        alt={gridArticles[5].title}
                        className="absolute inset-0 w-full h-full object-cover object-top opacity-60 group-hover:opacity-70 transition-opacity duration-300"
                      />
                      <div className="absolute inset-0 card-overlay bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 to-slate-900/90" />
                  )}
                  <div className="relative z-10 p-5 h-full flex flex-col justify-end">
                    <span className={`self-start mb-2 px-2.5 py-0.5 rounded-lg text-xs font-bold ${categoryColor(gridArticles[5].category)}`}>
                      {categoryLabel(gridArticles[5].category)}
                    </span>
                    <h3 className="font-bold text-lg sm:text-xl leading-snug text-slate-100 group-hover:text-brand-primary transition-colors line-clamp-2 mb-2">
                      {gridArticles[5].title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{timeAgo(gridArticles[5].created_at)}</span>
                      {fireEmoji(gridArticles[5].id)}
                    </div>
                  </div>
                </Link>
              )}
            </section>
          )}

          {/* ===== NEWS BRIEFING ===== */}
          {briefArticles.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-slate-100 pl-1 mb-4 flex items-center gap-2">
                <span className="text-brand-success">⚡</span> 뉴스 브리핑
              </h3>
              <div className="bento-card p-0 divide-y divide-white/5 overflow-hidden">
                {briefArticles.map((article) => {
                  const outUrl = (article as any).source_url ?? null;
                  const href = outUrl ?? `/article/${article.id}`;
                  const isExternal = !!outUrl;
                  return (
                    <a
                      key={article.id}
                      href={href}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
                    >
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium border border-white/10 ${categoryColor(article.category)}`}>
                        {categoryLabel(article.category)}
                      </span>
                      <span className="flex-1 text-sm text-slate-200 group-hover:text-brand-primary transition-colors line-clamp-1 min-w-0">
                        {article.title}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0 text-xs text-slate-500">
                        <span className="hidden sm:inline font-medium text-slate-400">{article.source_name}</span>
                        <span>{timeAgo(article.created_at)}</span>
                        {isExternal && (
                          <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Newsletter Signup */}
      <NewsletterSignup />

      {/* Footer */}
      <footer className="mt-4 py-4 border-t border-white/5 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} KoreaStartup.kr — 한국 스타트업 뉴스 큐레이션
      </footer>
    </div>
  );
}
