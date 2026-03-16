'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewArticlePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sourceType, setSourceType] = useState('external') // 'original' | 'external'
  const [isPremium, setIsPremium] = useState(false)
  const [price, setPrice] = useState(0)
  const [freeOneDay, setFreeOneDay] = useState(false)
  
  // AI Summary Logic
  const [aiSummary, setAiSummary] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Submitting
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const generateAISummary = async () => {
    if (!title && !content) {
      alert('제목과 본문을 먼저 작성해주세요.')
      return
    }
    setIsGeneratingSummary(true)
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })
      if (!res.ok) throw new Error('AI 요약 생성 실패')
      const data = await res.json()
      setAiSummary(data.summary)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const insertLinkSnippet = async () => {
    const url = prompt('삽입할 링크(URL)를 입력하세요:')
    if (!url) return
    
    // In a real app, you'd fetch OG tags here via an API. For now, creating a nice markdown block.
    const snippet = `\n> 🔗 **[링크로 이동하기](${url})**\n> ${url}\n\n`
    setContent(prev => prev + snippet)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // Check verification if premium
      if (isPremium) {
        const { data: profile } = await supabase
          .from('author_profiles')
          .select('is_verified')
          .eq('id', user.id)
          .single()

        if (!profile?.is_verified) {
          throw new Error('유료 기사 설정은 관리자 본인인증 후에만 가능합니다. 마이페이지에서 인증을 진행해주세요.')
        }
      }

      // Calculate free_until if 1-day free is checked
      let freeUntil = null
      if (isPremium && freeOneDay) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        freeUntil = tomorrow.toISOString()
      }

      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content_raw: content,
          is_premium: isPremium,
          price: isPremium ? price : 0,
          free_until: freeUntil,
          summary_5lines: aiSummary, // Pass user-edited summary
          author_id: user.id,
        })
      })

      if (!res.ok) throw new Error('기사 등록 실패')

      const { id } = await res.json()
      router.push(`/article/${id}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">새 기사 작성 (크리에이터용)</h1>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bento-card p-6">
        
        {/* Source Selection */}
        <div className="flex gap-4 p-4 border border-white/10 bg-slate-800/30 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="source" 
              value="external" 
              checked={sourceType === 'external'}
              onChange={() => setSourceType('external')}
              className="text-brand-primary bg-slate-900 border-white/20 focus:ring-brand-primary"
            />
            <span className="text-slate-300">외부 인용 (일반)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="source" 
              value="original" 
              checked={sourceType === 'original'}
              onChange={() => {
                setSourceType('original');
              }}
              className="text-brand-primary bg-slate-900 border-white/20 focus:ring-brand-primary"
            />
            <span className="text-brand-primary font-bold">오리지널 (직접 작성)</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">제목</label>
          <input
            required
            type="text"
            className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            placeholder="기사 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-300">본문 (Markdown)</label>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={async () => {
                  if (!title) return alert('제목을 먼저 입력해주세요.');
                  try {
                    const res = await fetch('/api/ai/generate-image', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ prompt: title })
                    });
                    const { url } = await res.json();
                    if (url) {
                      setContent(prev => `![AI 대표 이미지](${url})\n\n` + prev);
                    }
                  } catch (e) {
                    alert('이미지 생성 실패');
                  }
                }} 
                className="text-xs bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 px-2 py-1 rounded transition-colors"
              >
                🎨 AI 대표 이미지 생성
              </button>
              <button type="button" onClick={insertLinkSnippet} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white transition-colors">
                🔗 링크 스니펫 추가
              </button>
            </div>
          </div>
          <textarea
            required
            rows={15}
            className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 font-mono text-sm leading-relaxed"
            placeholder="기사 본문을 마크다운 형식으로 작성해주세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* AI Summary Editor */}
        <div className="p-4 border border-brand-primary/30 bg-brand-primary/5 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <label className="block font-bold text-brand-primary flex items-center gap-2">
              ✨ AI 요약
            </label>
            <button 
              type="button" 
              onClick={generateAISummary}
              disabled={isGeneratingSummary}
              className="text-xs bg-brand-primary text-slate-900 font-bold px-3 py-1.5 rounded-md hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
            >
              {isGeneratingSummary ? '요약 생성 중...' : '자동 요약 생성하기'}
            </button>
          </div>
          <textarea
            rows={5}
            className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm leading-relaxed"
            placeholder="AI 버튼을 눌러 요약을 자동 생성하거나 직접 요약을 작성해주세요."
            value={aiSummary}
            onChange={(e) => setAiSummary(e.target.value)}
          />
        </div>

        {/* Monetization / Premium settings */}
        <div className="border hover:border-brand-primary/50 transition-colors border-white/10 bg-slate-800/30 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-white/20 bg-slate-900 focus:ring-brand-primary/50 text-brand-primary custom-checkbox"
              checked={isPremium}
              onChange={(e) => {
                setIsPremium(e.target.checked)
                if (e.target.checked) {
                  alert('정산은 호스트(관리자)의 본인인증 완료 후 가능하며, 판매 수익의 40%가 정산됩니다.');
                }
              }}
            />
            <span className="font-medium text-brand-primary">유료 기사 설정 (Premium Insight)</span>
          </label>
          
          {isPremium && (
            <div className="mt-4 pl-8 flex flex-col gap-4">
              {sourceType === 'original' && (
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
                  required
                  type="number"
                  min="0"
                  step="100"
                  className="w-full sm:w-1/2 bg-slate-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  placeholder="예: 5000"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
                <p className="text-xs text-slate-400 mt-2">
                  *결제 수수료 제외, 판매 금액의 40%가 작성자에게 정산됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !title || !content}
          className="btn-primary mt-4 disabled:opacity-50 flex justify-center py-3"
        >
          {loading ? '등록 중...' : '기사 등록 완료'}
        </button>
      </form>
    </div>
  )
}
