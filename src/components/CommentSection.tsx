'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Comment {
  id: string
  content: string
  anonymous_name: string | null
  anonymous_ip: string | null
  user_id: string | null
  parent_id: string | null
  depth: number
  is_blinded: boolean
  blind_reason: string | null
  created_at: string
  children?: Comment[]
}

function generateAnonName(): string {
  const chars = 'abcdef0123456789'
  let hash = ''
  for (let i = 0; i < 4; i++) hash += chars[Math.floor(Math.random() * chars.length)]
  return `익명_${hash}`
}

function maskIp(): string {
  const a = Math.floor(Math.random() * 200) + 10
  const b = Math.floor(Math.random() * 200) + 10
  return `${a}.${b}.xx.xx`
}

function buildTree(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>()
  const roots: Comment[] = []
  comments.forEach(c => map.set(c.id, { ...c, children: [] }))
  comments.forEach(c => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

const DEPTH_COLORS = ['border-white/5', 'border-brand-primary/20', 'border-yellow-500/20']

function CommentNode({
  comment,
  onReply,
  replyingTo,
}: {
  comment: Comment
  onReply: (parentId: string, depth: number) => void
  replyingTo: string | null
}) {
  const maxDepth = 2
  const indent = comment.depth * 24

  return (
    <div style={{ marginLeft: indent }} className="flex flex-col gap-2">
      <div className={`p-4 rounded-lg border-l-2 ${comment.is_blinded ? 'bg-red-900/10 border-red-500/30' : 'bg-white/5'} ${DEPTH_COLORS[comment.depth] ?? DEPTH_COLORS[0]}`}>
        {comment.is_blinded ? (
          // Blinded comment
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>🚫</span>
            <span className="italic">이 댓글은 커뮤니티 가이드라인 위반으로 블라인드 처리되었습니다.</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {comment.user_id ? (
                  <>
                    <span className="w-6 h-6 rounded-full bg-brand-primary/30 flex items-center justify-center text-xs">👤</span>
                    <span className="text-sm font-medium">회원</span>
                  </>
                ) : (
                  <>
                    <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs">🎭</span>
                    <span className="text-sm font-medium text-slate-400">{comment.anonymous_name}</span>
                    <span className="text-xs text-slate-600">({comment.anonymous_ip})</span>
                  </>
                )}
                {comment.depth > 0 && <span className="text-xs text-slate-600">↳ 답글</span>}
              </div>
              <span className="text-xs text-slate-500">
                {new Date(comment.created_at).toLocaleDateString('ko-KR', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{comment.content}</p>
            {comment.depth < maxDepth && (
              <button
                onClick={() => onReply(comment.id, comment.depth)}
                className={`mt-2 text-xs transition-colors ${
                  replyingTo === comment.id ? 'text-brand-primary font-medium' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {replyingTo === comment.id ? '✏️ 답글 작성 중...' : '💬 답글'}
              </button>
            )}
          </>
        )}
      </div>
      {comment.children && comment.children.length > 0 && (
        <div className="flex flex-col gap-2">
          {comment.children.map(child => (
            <CommentNode key={child.id} comment={child} onReply={onReply} replyingTo={replyingTo} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ articleId, tagIds }: { articleId: string; tagIds?: string[] }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'anon' | 'login'>('anon')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyDepth, setReplyDepth] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchComments()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) setMode('login')
    })
  }, [])

  const fetchComments = async () => {
    // Fetch article comments
    const { data: articleComments } = await supabase
      .from('comments')
      .select('id, content, anonymous_name, anonymous_ip, user_id, parent_id, depth, is_blinded, blind_reason, created_at')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true })

    let allComments = (articleComments ?? []) as Comment[]

    // Also fetch tag comments if tagIds are provided
    if (tagIds && tagIds.length > 0) {
      const { data: tagComments } = await supabase
        .from('comments')
        .select('id, content, anonymous_name, anonymous_ip, user_id, parent_id, depth, is_blinded, blind_reason, created_at')
        .in('tag_id', tagIds)
        .order('created_at', { ascending: true })

      if (tagComments) {
        // Merge and deduplicate by id
        const existingIds = new Set(allComments.map(c => c.id))
        for (const tc of tagComments) {
          if (!existingIds.has(tc.id)) {
            allComments.push(tc as Comment)
          }
        }
        // Sort merged list by date
        allComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }
    }

    setComments(allComments)
  }

  const handleReply = useCallback((parentId: string, depth: number) => {
    if (replyingTo === parentId) { setReplyingTo(null); setReplyDepth(0) }
    else { setReplyingTo(parentId); setReplyDepth(depth + 1) }
  }, [replyingTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setNotice(null)

    const payload: Record<string, unknown> = {
      article_id: articleId,
      content: content.trim(),
      parent_id: replyingTo,
      depth: replyingTo ? replyDepth : 0,
    }

    if (mode === 'login' && user) {
      payload.user_id = user.id
    } else {
      payload.user_id = null
      payload.anonymous_name = generateAnonName()
      payload.anonymous_ip = maskIp()
    }

    // Use the API route for profanity checking
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json()

    if (result.is_blinded) {
      setNotice('⚠️ 부적절한 표현이 감지되어 블라인드 처리되었습니다.')
    }

    setContent('')
    setReplyingTo(null)
    setReplyDepth(0)
    setLoading(false)
    fetchComments()
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
  }

  const tree = buildTree(comments)

  return (
    <section className="flex flex-col gap-6">
      <h3 className="text-xl font-bold flex items-center gap-2">
        💬 댓글 <span className="text-sm font-normal text-slate-400">({comments.length}개)</span>
      </h3>

      <div className="flex flex-col gap-3">
        {tree.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</p>
        ) : (
          tree.map(comment => (
            <CommentNode key={comment.id} comment={comment} onReply={handleReply} replyingTo={replyingTo} />
          ))
        )}
      </div>

      {replyingTo && (
        <div className="flex items-center gap-2 text-sm text-brand-primary bg-brand-primary/10 px-4 py-2 rounded-lg">
          <span>↳ 답글 작성 중 (깊이 {replyDepth + 1}/3단계)</span>
          <button onClick={() => { setReplyingTo(null); setReplyDepth(0) }} className="ml-auto text-xs text-slate-400 hover:text-white">✕ 취소</button>
        </div>
      )}

      {notice && (
        <div className="text-sm text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-lg">{notice}</div>
      )}

      <form onSubmit={handleSubmit} className="bento-card p-6 flex flex-col gap-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('anon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'anon' ? 'bg-slate-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            🎭 익명으로 작성
          </button>
          {user ? (
            <button type="button" onClick={() => setMode('login')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'login' ? 'bg-brand-primary/30 text-brand-primary' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
              👤 {user.email?.split('@')[0]}(으)로 작성
            </button>
          ) : (
            <button type="button" onClick={handleGoogleLogin}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:bg-white/10 transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google 로그인
            </button>
          )}
        </div>
        {mode === 'anon' && <p className="text-xs text-slate-500">익명으로 작성 시 임의의 닉네임과 마스킹된 IP가 표시됩니다.</p>}
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder={replyingTo ? '답글을 입력하세요...' : '댓글을 입력하세요...'} rows={3}
          className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm resize-none" />
        <button type="submit" disabled={loading || !content.trim()} className="btn-primary py-2 disabled:opacity-50">
          {loading ? '등록 중...' : replyingTo ? '답글 등록' : '댓글 등록'}
        </button>
      </form>
    </section>
  )
}
