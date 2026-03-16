import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { count: articleCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });

  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { data: recentArticles } = await supabase
    .from('articles')
    .select('id, title, source_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        <p className="text-slate-400 mt-1">KoreaStartup.kr 콘텐츠 관리 시스템</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bento-card p-6 flex flex-col gap-2">
          <p className="text-sm text-slate-400">총 기사 수</p>
          <p className="text-4xl font-bold text-brand-primary">{articleCount ?? 0}</p>
          <Link href="/admin/articles" className="text-xs text-brand-primary hover:underline mt-2">
            기사 관리 →
          </Link>
        </div>
        <div className="bento-card p-6 flex flex-col gap-2">
          <p className="text-sm text-slate-400">등록된 사용자</p>
          <p className="text-4xl font-bold text-brand-success">{userCount ?? 0}</p>
        </div>
        <div className="bento-card p-6 flex flex-col gap-2">
          <p className="text-sm text-slate-400">빠른 작업</p>
          <Link href="/admin/articles/new" className="btn-primary text-center mt-2">
            ✏️ 새 기사 작성
          </Link>
        </div>
      </div>

      {/* Recent Articles */}
      <div className="bento-card p-6">
        <h2 className="text-lg font-semibold mb-4">최근 등록된 기사</h2>
        {recentArticles && recentArticles.length > 0 ? (
          <ul className="space-y-3">
            {recentArticles.map((article) => (
              <li key={article.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div>
                  <p className="font-medium text-sm">{article.title}</p>
                  <p className="text-xs text-slate-400">{article.source_name}</p>
                </div>
                <Link href={`/admin/articles/${article.id}/edit`} className="text-xs text-brand-primary hover:underline">
                  수정
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-lg mb-2">아직 등록된 기사가 없습니다</p>
            <Link href="/admin/articles/new" className="text-brand-primary hover:underline text-sm">
              첫 번째 기사를 작성해 보세요 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
