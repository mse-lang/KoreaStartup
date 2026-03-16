'use client'

import { useState, useEffect } from 'react'

interface Source {
  id: string
  name: string
  feed_url: string
  label: string
  source_name: string
  max_articles: number
  is_active: boolean
  created_at: string
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [crawling, setCrawling] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formSource, setFormSource] = useState('')
  const [formMax, setFormMax] = useState(5)

  useEffect(() => { fetchSources() }, [])

  const fetchSources = async () => {
    setLoading(true)
    const res = await fetch('/api/sources')
    const data = await res.json()
    setSources(data.sources ?? [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormName(''); setFormUrl(''); setFormLabel(''); setFormSource(''); setFormMax(5)
    setEditId(null); setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: formName || formUrl.split('/').filter(Boolean).pop(),
      feed_url: formUrl,
      label: formLabel || formSource,
      source_name: formSource,
      max_articles: formMax,
    }

    let res
    if (editId) {
      res = await fetch('/api/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...payload }),
      })
    } else {
      res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    const result = await res.json()
    if (!res.ok) {
      setNotice(`❌ ${result.error}`)
    } else {
      setNotice(editId ? '✅ 수정 완료' : '✅ 추가 완료')
      resetForm()
      fetchSources()
    }
    setTimeout(() => setNotice(null), 3000)
  }

  const handleToggle = async (source: Source) => {
    await fetch('/api/sources', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: source.id, is_active: !source.is_active }),
    })
    fetchSources()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 수집처를 삭제하시겠습니까?')) return
    await fetch(`/api/sources?id=${id}`, { method: 'DELETE' })
    fetchSources()
  }

  const handleEdit = (source: Source) => {
    setEditId(source.id)
    setFormName(source.name)
    setFormUrl(source.feed_url)
    setFormLabel(source.label)
    setFormSource(source.source_name)
    setFormMax(source.max_articles)
    setShowForm(true)
  }

  const handleCrawlNow = async () => {
    setCrawling(true)
    setNotice('🔄 수집 중...')
    try {
      const res = await fetch('/api/crawl')
      const data = await res.json()
      setNotice(`✅ ${data.message}`)
    } catch {
      setNotice('❌ 수집 실패')
    }
    setCrawling(false)
    setTimeout(() => setNotice(null), 5000)
  }

  const groupedSources = sources.reduce<Record<string, Source[]>>((acc, s) => {
    (acc[s.source_name] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">📡 콘텐츠 수집처 관리</h1>
          <p className="text-sm text-slate-400 mt-1">
            RSS 피드 소스를 추가/수정/삭제할 수 있습니다. <span className="text-brand-primary">매 2시간마다</span> 자동 수집됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCrawlNow}
            disabled={crawling}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
          >
            {crawling ? '수집 중...' : '🔄 지금 수집'}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm) }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-primary hover:bg-brand-primary/80 text-white transition-colors"
          >
            {showForm ? '✕ 닫기' : '➕ 수집처 추가'}
          </button>
        </div>
      </div>

      {notice && (
        <div className={`px-4 py-2 rounded-lg text-sm ${notice.startsWith('❌') ? 'bg-red-500/10 text-red-400' : notice.startsWith('🔄') ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
          {notice}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bento-card p-6 flex flex-col gap-4">
          <h3 className="font-bold">{editId ? '수집처 수정' : '새 수집처 추가'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">미디어 이름 *</label>
              <input value={formSource} onChange={e => setFormSource(e.target.value)}
                placeholder="예: 벤처스퀘어" required
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">RSS 피드 URL *</label>
              <input value={formUrl} onChange={e => setFormUrl(e.target.value)}
                placeholder="https://example.com/feed" required type="url"
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">카테고리 이름</label>
              <input value={formName} onChange={e => setFormName(e.target.value)}
                placeholder="예: special-post"
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">표시 라벨</label>
              <input value={formLabel} onChange={e => setFormLabel(e.target.value)}
                placeholder="예: 스페셜포스트"
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">최대 수집 수</label>
              <input type="number" value={formMax} onChange={e => setFormMax(Number(e.target.value))}
                min={1} max={50}
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-6 py-2">
              {editId ? '수정' : '추가'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg text-sm bg-white/5 text-slate-400 hover:bg-white/10">
              취소
            </button>
          </div>
        </form>
      )}

      {/* Sources List grouped by media */}
      {loading ? (
        <div className="bento-card p-12 text-center text-slate-400">로딩 중...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(groupedSources).map(([sourceName, feeds]) => (
            <div key={sourceName} className="bento-card p-0 overflow-hidden">
              <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                <h4 className="font-bold text-sm">{sourceName} <span className="text-xs text-slate-500 font-normal">({feeds.length}개 피드)</span></h4>
              </div>
              <div className="divide-y divide-white/5">
                {feeds.map(source => (
                  <div key={source.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors">
                    <button
                      onClick={() => handleToggle(source)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${source.is_active ? 'bg-green-500' : 'bg-slate-700'}`}
                      title={source.is_active ? '활성' : '비활성'}
                    >
                      <span className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${source.is_active ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{source.label}</span>
                        <span className="text-xs text-slate-500">({source.name})</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">최대 {source.max_articles}개</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{source.feed_url}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(source)}
                        className="px-2 py-1 text-xs rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(source.id)}
                        className="px-2 py-1 text-xs rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {sources.length === 0 && (
            <div className="bento-card p-12 text-center text-slate-400">
              등록된 수집처가 없습니다. &quot;수집처 추가&quot; 버튼을 눌러 RSS 피드를 추가하세요.
            </div>
          )}
        </div>
      )}

      {/* Cron Info */}
      <div className="bento-card p-5 bg-brand-primary/5 border-brand-primary/20">
        <h4 className="font-bold text-sm mb-2">⏰ 자동 수집 스케줄</h4>
        <p className="text-sm text-slate-300">매 <span className="text-brand-primary font-bold">2시간</span>마다 자동으로 활성화된 수집처의 새 기사를 수집합니다.</p>
        <p className="text-xs text-slate-500 mt-1">cron: <code className="bg-black/30 px-1.5 py-0.5 rounded">0 */2 * * *</code> (vercel.json)</p>
      </div>
    </div>
  )
}
