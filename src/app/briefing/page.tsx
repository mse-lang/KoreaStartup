'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/UserMenu';
import ReactMarkdown from 'react-markdown';

export default function BriefingPage() {
  const [briefing, setBriefing] = useState('');
  const [articleCount, setArticleCount] = useState(0);
  const [generatedAt, setGeneratedAt] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/briefing')
      .then(r => r.json())
      .then(data => {
        setBriefing(data.briefing || '');
        setArticleCount(data.article_count || 0);
        setGeneratedAt(data.generated_at || '');
        setLoading(false);
      })
      .catch(() => {
        setBriefing('브리핑을 불러오는데 실패했습니다.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto flex flex-col gap-6">
      <header className="flex justify-between items-center py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">← 홈으로</Link>
          <h1 className="text-xl sm:text-2xl font-bold">🤖 AI 데일리 브리핑</h1>
        </div>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {loading ? (
        <div className="bento-card p-12 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <span className="w-3 h-3 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-3 h-3 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-3 h-3 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-slate-400 text-sm">AI가 오늘의 브리핑을 작성하고 있습니다...</p>
        </div>
      ) : (
        <>
          {/* Briefing Stats */}
          <div className="flex gap-3 text-xs text-slate-500">
            <span>📰 분석 기사 {articleCount}건</span>
            {generatedAt && <span>⏱️ {new Date(generatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 생성</span>}
          </div>

          {/* Briefing Content */}
          <article className="bento-card p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="relative z-10 prose-article text-slate-200">
              <ReactMarkdown>{briefing}</ReactMarkdown>
            </div>
          </article>

          {/* CTA */}
          <div className="flex gap-3 justify-center">
            <Link href="/" className="btn-primary px-6">📰 전체 기사 보기</Link>
            <Link href="/search" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">
              🔍 AI 검색하기
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
