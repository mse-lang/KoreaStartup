import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user role for RBAC
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'editor')) {
    redirect('/'); // Unauthorized users are sent back to the main page
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-black/30 backdrop-blur-xl p-4 md:p-6 flex md:flex-col gap-4 md:gap-6">
        <div className="flex md:flex-col gap-2">
          <Link href="/" className="text-xl font-bold text-brand-primary tracking-tight">
            KS Admin
          </Link>
          <p className="hidden md:block text-xs text-slate-500 -mt-1">관리자 대시보드</p>
        </div>

        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible md:mt-2 flex-1">
          <Link
            href="/admin"
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
          >
            📊 대시보드
          </Link>
          <Link
            href="/admin/articles"
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
          >
            📰 기사 관리
          </Link>
          <Link
            href="/admin/articles/new"
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
          >
            ✏️ 새 기사
          </Link>
          <Link
            href="/admin/comments"
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
          >
            💬 댓글 관리
          </Link>
          <Link
            href="/admin/profile"
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
          >
            👤 내 프로필
          </Link>
          <Link
            href="/admin/sources"
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap"
          >
            📡 수집처 관리
          </Link>
        </nav>

        <div className="hidden md:flex flex-col gap-3 mt-auto">
          <ThemeToggle />
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-slate-400">접속 계정</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
          <Link
            href="/"
            className="block text-center text-xs text-slate-500 hover:text-white transition-colors"
          >
            ← 메인 사이트로 이동
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
