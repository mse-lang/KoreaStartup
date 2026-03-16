import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ArticleListClient from './ArticleListClient';
import { redirect } from 'next/navigation';

export default async function ArticleListPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'editor';

  // Build the query
  let query = supabase
    .from('articles')
    .select('id, title, source_name, source_url, summary_5lines, published_at, created_at')
    .order('created_at', { ascending: false });

  // If not admin, restrict to own articles
  if (!isAdmin) {
    query = query.eq('author_id', user.id);
  }

  const { data: articles, error } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="admin-header flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">기사 관리</h1>
          <p className="text-slate-400 mt-1">
            {isAdmin ? '모든 등록된 기사를 조회, 수정, 삭제합니다' : '내가 등록한 기사를 조회, 수정, 삭제합니다'}
          </p>
        </div>
        <Link href="/admin/articles/new" className="btn-primary">
          + 새 기사 작성
        </Link>
      </div>

      <ArticleListClient initialArticles={articles || []} />
    </div>
  );
}
