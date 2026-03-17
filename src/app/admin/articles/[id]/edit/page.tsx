'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [title, setTitle] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [contentRaw, setContentRaw] = useState('')
  const [summary, setSummary] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [ogImageUrl, setOgImageUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingSources, setExistingSources] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchArticle = async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('기사를 찾을 수 없습니다.')
      } else {
        setTitle(data.title)
        setSourceName(data.source_name)
        setSourceUrl(data.source_url)
        setContentRaw(data.content_raw)
        setSummary(data.summary_5lines || '')
        setExcerpt(data.excerpt || '')
        setOgImageUrl(data.og_image_url || '')
      }
      setLoading(false)
    }

    // Fetch distinct source names for autocomplete
    const fetchSources = async () => {
      const { data } = await supabase
        .from('rss_sources')
        .select('source_name')
        .order('source_name')
      if (data) {
        const unique = [...new Set(data.map(s => s.source_name))]
        setExistingSources(unique)
      }
    }

    fetchArticle()
    fetchSources()
  }, [id, supabase])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('articles')
      .update({
        title,
        source_name: sourceName,
        source_url: sourceUrl,
        content_raw: contentRaw,
        summary_5lines: summary,
        excerpt: excerpt || null,
        og_image_url: ogImageUrl || null,
      })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
    } else {
      router.push('/admin/articles')
      router.refresh()
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 이 기사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    setDeleting(true)

    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
    } else {
      router.push('/admin/articles')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 rounded-full bg-brand-primary animate-ping"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">기사 수정</h1>
          <p className="text-slate-400 mt-1 text-sm font-mono">{id}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 text-sm bg-brand-error/20 text-brand-error rounded-lg hover:bg-brand-error/30 transition-colors disabled:opacity-50"
        >
          {deleting ? '삭제 중...' : '🗑️ 기사 삭제'}
        </button>
      </div>

      <form onSubmit={handleUpdate} className="bento-card p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">기사 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">출처 이름 *</label>
            <input
              type="text"
              list="source-list"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              required
              placeholder="직접 입력 또는 선택"
              className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
            <datalist id="source-list">
              {existingSources.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500">기존 출처 선택 또는 새 출처명 직접 입력</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">원문 링크 (URL) *</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required
              className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">📝 요약글 (카드에 표시)</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            placeholder="기사 카드에 표시될 요약글입니다. RSS에서 자동으로 가져오거나 직접 작성할 수 있습니다."
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">✨ AI 5줄 핵심 요약</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm font-mono"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">본문 내용 (Markdown) *</label>
          <textarea
            value={contentRaw}
            onChange={(e) => setContentRaw(e.target.value)}
            required
            rows={12}
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm font-mono"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">대표 이미지 URL (선택)</label>
          <input
            type="url"
            value={ogImageUrl}
            onChange={(e) => setOgImageUrl(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm"
          />
        </div>

        {error && <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 py-3 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
          <Link
            href="/admin/articles"
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-center hover:bg-white/10 transition-colors"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}
