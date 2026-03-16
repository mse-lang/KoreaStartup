import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/UserMenu';

export default async function BookmarksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('article_id, created_at, articles(id, title, source_name, summary_5lines, og_image_url, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto flex flex-col gap-6">
      <header className="flex justify-between items-center py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">← 홈으로</Link>
          <h1 className="text-2xl font-bold">📑 내 스크랩</h1>
        </div>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {!bookmarks || bookmarks.length === 0 ? (
        <div className="bento-card p-12 flex flex-col items-center gap-4">
          <p className="text-4xl">📑</p>
          <h2 className="text-xl font-bold">스크랩한 기사가 없습니다</h2>
          <p className="text-slate-400 text-center text-sm">기사 상세 페이지에서 북마크 아이콘을 눌러 스크랩해 보세요.</p>
          <Link href="/" className="btn-primary mt-2">홈으로 돌아가기</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">{bookmarks.length}개의 스크랩</p>
          {bookmarks.map((bm: any) => {
            const article = Array.isArray(bm.articles) ? bm.articles[0] : bm.articles;
            if (!article) return null;
            return (
              <Link
                key={bm.article_id}
                href={`/article/${article.id}`}
                className="bento-card p-0 flex flex-col sm:flex-row overflow-hidden hover:-translate-y-1 hover:border-brand-primary/30 transition-all group block"
              >
                {article.og_image_url ? (
                  <img
                    src={article.og_image_url}
                    alt={article.title}
                    className="w-full sm:w-40 h-32 sm:h-auto object-cover"
                  />
                ) : (
                  <div className="w-full sm:w-40 h-32 sm:h-auto bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-3xl">📰</div>
                )}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3 className="font-bold text-base group-hover:text-brand-primary transition-colors line-clamp-2">{article.title}</h3>
                  {article.summary_5lines && (
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {article.summary_5lines.split('\n')[0]?.replace(/^\d+\.\s*/, '')}
                    </p>
                  )}
                  <div className="flex gap-3 text-xs text-slate-500 mt-auto">
                    <span>{article.source_name}</span>
                    <span>{timeAgo(article.created_at)}</span>
                    <span className="text-yellow-500">★ 스크랩됨</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
