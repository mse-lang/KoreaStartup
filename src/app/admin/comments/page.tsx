'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface AdminComment {
  id: string
  content: string
  anonymous_name: string | null
  user_id: string | null
  is_blinded: boolean
  blind_reason: string | null
  depth: number
  created_at: string
  article_id: string
  articles?: { title: string } | { title: string }[] | null
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [filter, setFilter] = useState<'all' | 'blinded' | 'active'>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchComments() }, [filter])

  const fetchComments = async () => {
    setLoading(true)
    let query = supabase
      .from('comments')
      .select('id, content, anonymous_name, user_id, is_blinded, blind_reason, depth, created_at, article_id, articles(title)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter === 'blinded') query = query.eq('is_blinded', true)
    if (filter === 'active') query = query.eq('is_blinded', false)

    const { data } = await query
    if (data) setComments(data as AdminComment[])
    setLoading(false)
  }

  const toggleBlind = async (id: string, currentBlind: boolean) => {
    await supabase
      .from('comments')
      .update({
        is_blinded: !currentBlind,
        blind_reason: !currentBlind ? '관리자 블라인드' : null,
      })
      .eq('id', id)
    fetchComments()
  }

  const deleteComment = async (id: string) => {
    if (!confirm('이 댓글을 영구 삭제하시겠습니까?')) return
    await supabase.from('comments').delete().eq('id', id)
    fetchComments()
  }

  const getArticleTitle = (c: AdminComment) => {
    if (!c.articles) return '알 수 없음'
    if (Array.isArray(c.articles)) return c.articles[0]?.title ?? '알 수 없음'
    return c.articles.title
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">💬 댓글 관리</h1>
          <p className="text-slate-400 mt-1 text-sm">전체 {comments.length}개</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'blinded'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-brand-primary text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {f === 'all' ? '🗂️ 전체' : f === 'active' ? '✅ 정상' : '🚫 블라인드'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full bg-brand-primary animate-ping"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <p className="text-slate-400">댓글이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map(comment => (
            <div
              key={comment.id}
              className={`bento-card p-5 flex flex-col gap-3 ${comment.is_blinded ? 'border-red-500/30' : ''}`}
            >
              {/* Top Row */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 flex-wrap">
                  {comment.is_blinded && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                      🚫 블라인드
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {comment.user_id ? '👤 회원' : `🎭 ${comment.anonymous_name}`}
                  </span>
                  {comment.depth > 0 && (
                    <span className="text-xs text-slate-600">↳ 답글 (깊이 {comment.depth + 1})</span>
                  )}
                  <span className="text-xs text-slate-600">
                    {new Date(comment.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleBlind(comment.id, comment.is_blinded)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      comment.is_blinded
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                  >
                    {comment.is_blinded ? '✅ 해제' : '🚫 블라인드'}
                  </button>
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="px-3 py-1 rounded text-xs font-medium bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    🗑️ 삭제
                  </button>
                </div>
              </div>

              {/* Comment Content */}
              <p className={`text-sm leading-relaxed break-all whitespace-pre-wrap ${comment.is_blinded ? 'text-red-300/60 line-through' : 'text-slate-200'}`}>
                {comment.content}
              </p>

              {/* Blind Reason */}
              {comment.blind_reason && (
                <p className="text-xs text-red-400/60">사유: {comment.blind_reason}</p>
              )}

              {/* Article Link */}
              <Link
                href={`/article/${comment.article_id}`}
                className="text-xs text-slate-500 hover:text-brand-primary transition-colors truncate"
              >
                📰 {getArticleTitle(comment)}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
