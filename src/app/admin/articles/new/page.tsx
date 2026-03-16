'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewArticlePage() {
  const [title, setTitle] = useState('')
  const [sourceName, setSourceName] = useState('오리지널') // default
  const [sourceUrl, setSourceUrl] = useState('')
  const [contentRaw, setContentRaw] = useState('')
  const [summary, setSummary] = useState('')
  const [ogImageUrl, setOgImageUrl] = useState('')
  
  const [isPremium, setIsPremium] = useState(false)
  const [price, setPrice] = useState(0)
  const [freeOneDay, setFreeOneDay] = useState(false)

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const generateAISummary = async () => {
    if (!title && !contentRaw) {
      alert('제목과 본문을 먼저 작성해주세요.')
      return
    }
    setIsGeneratingSummary(true)
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: contentRaw })
      })
      if (!res.ok) throw new Error('AI 요약 생성 실패')
      const data = await res.json()
      setSummary(data.summary)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const generateAIImage = async () => {
    if (!title) {
      alert('제목을 먼저 입력해주세요.')
      return
    }
    setIsGeneratingImage(true)
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ prompt: title })
      })
      if (!res.ok) throw new Error('이미지 생성 실패')
      const { url } = await res.json()
      if (url) {
        setOgImageUrl(url)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const insertLinkSnippet = () => {
    const url = prompt('삽입할 링크(URL)를 입력하세요:')
    if (!url) return
    const snippet = `\n> 🔗 **[링크로 이동하기](${url})**\n> ${url}\n\n`
    setContentRaw(prev => prev + snippet)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    let freeUntil = null
    if (isPremium && freeOneDay) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      freeUntil = tomorrow.toISOString()
    }

    const { error: insertError } = await supabase.from('articles').insert({
      title,
      source_name: sourceName,
      source_url: sourceUrl || 'https://koreastartup.kr',
      content_raw: contentRaw,
      summary_5lines: summary,
      og_image_url: ogImageUrl || null,
      author_id: user.id,
      published_at: new Date().toISOString(),
      is_premium: isPremium,
      price: isPremium ? price : 0,
      free_until: freeUntil,
      category: sourceName === '오리지널' ? 'user-generated' : 'news'
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/admin/articles')
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">새 기사 작성 (관리자)</h1>
        <p className="text-slate-400 mt-1">새로운 뉴스 기사를 등록합니다</p>
      </div>

      <form onSubmit={handleSubmit} className="bento-card p-8 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">기사 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="예: Y Combinator, 한국 AI 스타트업 5곳 W26 배치 선정"
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
          />
        </div>

        {/* Source Name + URL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">출처 이름 *</label>
            <select
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            >
              <option value="오리지널">✨ 오리지널 (직접 작성)</option>
              <option value="벤처스퀘어">벤처스퀘어</option>
              <option value="K-Startup">K-Startup (정부)</option>
              <option value="나라장터">나라장터 (조달청)</option>
              <option value="창업진흥원">창업진흥원</option>
              <option value="TechCrunch">TechCrunch</option>
              <option value="기타">기타</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">원문 링크 (URL)</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
          </div>
        </div>
        
        {/* Content (Raw Markdown) */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-slate-300 flex flex-col gap-1">
              <span>본문 내용 (Markdown) *</span>
              <span className="text-xs text-slate-500">Jina Reader 추출 원문 또는 직접 작성</span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={insertLinkSnippet} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-white transition-colors">
                🔗 링크 스니펫 추가
              </button>
            </div>
          </div>
          <textarea
            value={contentRaw}
            onChange={(e) => setContentRaw(e.target.value)}
            required
            rows={12}
            placeholder="기사 본문을 Markdown 형식으로 입력하세요..."
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm font-mono leading-relaxed"
          />
        </div>

        {/* AI 5-Line Summary */}
        <div className="flex flex-col gap-2 p-4 border border-brand-primary/30 bg-brand-primary/5 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-brand-primary flex items-center">
              ✨ AI 요약
              <span className="text-xs text-brand-primary/60 font-normal ml-2">자동 생성하거나 직접 작성해주세요</span>
            </label>
            <button 
              type="button" 
              onClick={generateAISummary}
              disabled={isGeneratingSummary}
              className="text-xs bg-brand-primary text-slate-900 font-bold px-3 py-1.5 rounded hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
            >
              {isGeneratingSummary ? '요약 생성 중...' : '자동 요약 생성하기'}
            </button>
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
            placeholder={"AI 버튼을 눌러 요약을 자동 생성하거나 직접 작성해주세요."}
            className="bg-black/40 border border-brand-primary/20 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm font-mono leading-relaxed"
          />
        </div>

        {/* OG Image URL */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-slate-300">대표 이미지 URL (선택)</label>
            <button 
              type="button" 
              onClick={generateAIImage}
              disabled={isGeneratingImage}
              className="text-xs bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              🎨 {isGeneratingImage ? '생성 중...' : 'AI 대표 이미지 자동 생성'}
            </button>
          </div>
          <input
            type="url"
            value={ogImageUrl}
            onChange={(e) => setOgImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm"
          />
        </div>

        {/* Monetization / Premium settings */}
        <div className="border hover:border-brand-primary/50 transition-colors border-white/10 bg-black/20 rounded-lg p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-white/20 bg-slate-900 focus:ring-brand-primary/50 text-brand-primary custom-checkbox"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
            />
            <span className="font-medium text-brand-primary">유료 기사 설정 (Premium Insight)</span>
          </label>
          
          {isPremium && (
            <div className="mt-4 pl-8 flex flex-col gap-4">
              {sourceName === '오리지널' && (
                <label className="flex items-center gap-3 cursor-pointer bg-brand-primary/10 p-3 rounded border border-brand-primary/20">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-brand-primary/40 bg-slate-900 text-brand-primary"
                    checked={freeOneDay}
                    onChange={(e) => setFreeOneDay(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-200">
                    하루만 무료로 보여지는 콘텐츠로 유료화하시겠습니까? (24시간 후 자동 잠금)
                  </span>
                </label>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">구독/판매 가격 (원)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="w-full sm:w-1/2 bg-slate-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm"
                  placeholder="예: 5000"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        {error && <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 py-3 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '기사 등록하기'}
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
