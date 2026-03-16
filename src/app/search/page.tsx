'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import UserMenu from '@/components/UserMenu'

interface Article {
  id: string
  title: string
  source_name: string
  summary_5lines: string | null
  og_image_url: string | null
  created_at: string
  category: string
}

interface Tag {
  name: string
  slug: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])

  // Fetch random tags on mount
  useEffect(() => {
    fetch('/api/tags/random')
      .then(r => r.json())
      .then(data => setTags(data.tags ?? []))
      .catch(() => {})
  }, [])

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=${p}`)
    const data = await res.json()
    setArticles(data.articles)
    setTotal(data.total)
    setPage(data.page)
    setTotalPages(data.totalPages)
    setLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    doSearch(query, 1)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    return `${Math.floor(hours / 24)}일 전`
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto flex flex-col gap-6">
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

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="기사, 스타트업, 키워드 검색..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary px-6 rounded-xl" disabled={loading}>
          {loading ? '검색 중...' : '검색'}
        </button>
      </form>

      {/* Random Tags */}
      {tags.length > 0 && (
        <nav className="flex gap-1.5 flex-wrap">
          {tags.map(t => (
            <Link
              key={t.slug}
              href={`/tag/${t.slug}`}
              className="px-2.5 py-1 rounded-full text-xs bg-white/5 text-slate-400 hover:bg-brand-primary/20 hover:text-brand-primary transition-colors"
            >
              #{t.name}
            </Link>
          ))}
        </nav>
      )}

      {/* Results */}
      {searched && (
        <>
          <p className="text-sm text-slate-400">
            {loading ? '검색 중...' : `"${query}" 검색 결과 ${total}건`}
          </p>

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map(article => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="bento-card p-0 flex flex-col overflow-hidden hover:-translate-y-1 hover:border-brand-primary/50 transition-all duration-300 group block"
                >
                  {article.og_image_url ? (
                    <img src={article.og_image_url} alt={article.title} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl">📄</div>
                  )}
                  <div className="p-4 flex flex-col gap-1.5 flex-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{article.source_name}</span>
                      <span>{timeAgo(article.created_at)}</span>
                    </div>
                    <h4 className="font-bold text-sm leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
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
          ) : !loading ? (
            <div className="bento-card p-12 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-slate-400">검색 결과가 없습니다. 다른 키워드로 검색해 보세요.</p>
            </div>
          ) : null}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-2">
              {page > 1 && (
                <button onClick={() => doSearch(query, page - 1)} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10">← 이전</button>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => doSearch(query, p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${p === page ? 'bg-brand-primary text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  {p}
                </button>
              ))}
              {page < totalPages && (
                <button onClick={() => doSearch(query, page + 1)} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10">다음 →</button>
              )}
            </nav>
          )}
        </>
      )}

      {/* Pre-search: show trending tags */}
      {!searched && (
        <div className="bento-card p-12 text-center flex flex-col items-center gap-4">
          <p className="text-5xl">🔍</p>
          <h2 className="text-xl font-bold">무엇을 찾고 계세요?</h2>
          <p className="text-slate-400 text-sm">기사, 스타트업, 기술 키워드를 검색해 보세요.</p>
        </div>
      )}
    </div>
  )
}
