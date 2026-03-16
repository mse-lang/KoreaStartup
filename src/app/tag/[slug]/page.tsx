import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/UserMenu';
import CommunityComments from '@/components/CommunityComments';
import { COMMUNITY_TAGS } from '@/lib/tag-rules';
import TagNav from '@/components/TagNav';

const COMMUNITY_SLUGS = COMMUNITY_TAGS.map(t => t.slug);

const PER_PAGE = 6;
const COMMENTS_PER_PAGE = 10;

export default async function TagBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; cp?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page ?? '1'));
  const commentPage = Math.max(1, parseInt(sp.cp ?? '1'));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Special handling for "premium" pseudo-tag
  const isPremiumPage = slug === 'premium';

  if (isPremiumPage) {
    // Fetch premium articles directly
    const { count: totalArticles } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .or('is_premium.eq.true,category.eq.user-generated');
    
    const total = totalArticles ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);

    const { data: articles } = await supabase
      .from('articles')
      .select('id, title, source_name, summary_5lines, og_image_url, created_at, price, author_name')
      .or('is_premium.eq.true,category.eq.user-generated')
      .order('created_at', { ascending: false })
      .range((safePage - 1) * PER_PAGE, safePage * PER_PAGE - 1);

    const premiumArticles = articles ?? [];

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
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-3">
          <Link href="/" className="text-xl sm:text-2xl font-bold tracking-tight hover:text-brand-primary transition-colors">
            KoreaStartup.kr
          </Link>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </header>

        <TagNav activeSlug="premium" />

        <section className="bento-card p-6 sm:p-8 border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-yellow-500/5">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold">💎 프리미엄 콘텐츠</h1>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
              {total}개 콘텐츠
            </span>
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-slate-300">
            전문가 분석, 심층 인터뷰, 독점 리포트 등 유료 프리미엄 콘텐츠를 만나보세요.
          </p>
        </section>

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {premiumArticles.map((article) => (
              <Link
                key={article.id}
                href={`/article/${article.id}`}
                className="bento-card p-0 flex flex-col overflow-hidden hover:-translate-y-1 hover:border-amber-500/50 transition-all duration-300 group block"
              >
                {article.og_image_url ? (
                  <div className="relative">
                    <img src={article.og_image_url} alt={article.title} className="h-32 sm:h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full">PREMIUM</span>
                  </div>
                ) : (
                  <div className="relative h-32 sm:h-36 w-full bg-gradient-to-br from-amber-900/30 to-yellow-900/30 flex items-center justify-center text-3xl">
                    💎
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full">PREMIUM</span>
                  </div>
                )}
                <div className="p-4 flex flex-col gap-1.5 flex-1">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>{article.source_name}{article.author_name ? ` · ${article.author_name}` : ''}</span>
                    <span>{timeAgo(article.created_at)}</span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base leading-snug group-hover:text-amber-400 transition-colors line-clamp-2">
                    {article.title}
                  </h4>
                  {article.summary_5lines && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-auto">
                      {article.summary_5lines.split('\n')[0]?.replace(/^\d+\.\s*/, '')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {premiumArticles.length === 0 && (
            <div className="bento-card p-12 text-center border-amber-500/20">
              <p className="text-4xl mb-3">💎</p>
              <p className="text-slate-400">프리미엄 콘텐츠가 아직 준비 중입니다.</p>
              <p className="text-xs text-slate-500 mt-1">곧 전문가 분석과 독점 리포트가 등록됩니다.</p>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-6">
              {safePage > 1 && (
                <Link href={`/tag/premium?page=${safePage - 1}`} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors">
                  ← 이전
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Link
                  key={p}
                  href={`/tag/premium?page=${p}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    p === safePage ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {p}
                </Link>
              ))}
              {safePage < totalPages && (
                <Link href={`/tag/premium?page=${safePage + 1}`} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors">
                  다음 →
                </Link>
              )}
            </nav>
          )}
        </section>

        <footer className="mt-4 py-4 border-t border-white/5 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} KoreaStartup.kr — 한국 스타트업 뉴스 큐레이션
        </footer>
      </div>
    );
  }

  // Get the tag (with description)
  const { data: tag } = await supabase
    .from('tags')
    .select('id, name, slug, article_count, description')
    .eq('slug', slug)
    .single();

  if (!tag) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col items-center justify-center gap-6">
        <p className="text-6xl">🏷️</p>
        <h1 className="text-2xl font-bold">태그를 찾을 수 없습니다</h1>
        <p className="text-slate-400">"{decodeURIComponent(slug)}" 태그가 존재하지 않습니다.</p>
        <Link href="/" className="btn-primary mt-4">홈으로 돌아가기</Link>
      </div>
    );
  }

  const isCommunity = COMMUNITY_SLUGS.includes(slug);

  // Get articles with this tag (paginated)
  const { data: articleLinks } = await supabase
    .from('article_tags')
    .select('article_id')
    .eq('tag_id', tag.id);

  const allArticleIds = articleLinks?.map(a => a.article_id) ?? [];
  const totalArticles = allArticleIds.length;
  const totalPages = Math.max(1, Math.ceil(totalArticles / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  let articles: any[] = [];
  if (allArticleIds.length > 0) {
    const { data } = await supabase
      .from('articles')
      .select('id, title, source_name, summary_5lines, og_image_url, created_at')
      .in('id', allArticleIds)
      .order('created_at', { ascending: false })
      .range((safePage - 1) * PER_PAGE, safePage * PER_PAGE - 1);
    articles = data ?? [];
  }


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
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>

      {/* Tag Navigation */}
      <TagNav activeSlug={slug} />

      {/* Tag Header with Description */}
      <section className="bento-card p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">#{tag.name}</h1>
          {isCommunity ? (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
              🗣️ 커뮤니티 게시판
            </span>
          ) : (
            <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium">
              기사 {totalArticles}개
            </span>
          )}
        </div>
        {tag.description && (
          <div className="flex flex-col gap-3 text-sm sm:text-base leading-relaxed text-slate-300">
            {tag.description.split('\n\n').map((para: string, idx: number) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        )}
      </section>

      {/* Community board: show ONLY CommunityComments (no articles) */}
      {isCommunity ? (
        <CommunityComments tagId={tag.id} tagName={tag.name} />
      ) : (
        <>
          {/* Article List (6 per page) */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="bento-card p-0 flex flex-col overflow-hidden hover:-translate-y-1 hover:border-brand-primary/50 transition-all duration-300 group block"
                >
                  {article.og_image_url ? (
                    <img
                      src={article.og_image_url}
                      alt={article.title}
                      className="h-32 sm:h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-32 sm:h-36 w-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl">
                      📄
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-1.5 flex-1">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>{article.source_name}</span>
                      <span>{timeAgo(article.created_at)}</span>
                    </div>
                    <h4 className="font-bold text-sm sm:text-base leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
                      {article.title}
                    </h4>
                    {article.summary_5lines && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-auto">
                        {article.summary_5lines.split('\n')[0]?.replace(/^\d+\.\s*/, '')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {articles.length === 0 && (
              <div className="bento-card p-12 text-center">
                <p className="text-slate-400">이 태그로 분류된 기사가 아직 없습니다.</p>
              </div>
            )}

            {/* Article Pagination */}
            {totalPages > 1 && (
              <nav className="flex justify-center gap-2 mt-6">
                {safePage > 1 && (
                  <Link
                    href={`/tag/${slug}?page=${safePage - 1}`}
                    className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    ← 이전
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Link
                    key={p}
                    href={`/tag/${slug}?page=${p}`}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      p === safePage ? 'bg-brand-primary text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                {safePage < totalPages && (
                  <Link
                    href={`/tag/${slug}?page=${safePage + 1}`}
                    className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    다음 →
                  </Link>
                )}
              </nav>
            )}
          </section>

          {/* Tag Comments — anyone can comment on any tag */}
          <CommunityComments tagId={tag.id} tagName={tag.name} />
        </>
      )}

      {/* Footer */}
      <footer className="mt-4 py-4 border-t border-white/5 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} KoreaStartup.kr — 한국 스타트업 뉴스 큐레이션
      </footer>
    </div>
  );
}
