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
  created_at: string
  children?: Comment[]
}

interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  embedType?: string
  embedId?: string
}

const MAX_CHARS = 2000

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

// Extract URLs from text
function extractUrls(text: string): string[] {
  const regex = /https?:\/\/[^\s<>"')\]]+/g
  return text.match(regex) ?? []
}

// Link preview display component
function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => { setPreview(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [url])

  if (loading) return <div className="h-16 rounded-lg bg-white/5 animate-pulse mt-2" />
  if (!preview?.title) return null

  // YouTube embed
  if (preview.embedType === 'youtube' && preview.embedId) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${preview.embedId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  // Favicon fallback when no OG image
  let hostname = ''
  try { hostname = new URL(preview.url).hostname } catch { hostname = '' }
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`

  // Generic link preview card
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex rounded-xl overflow-hidden border border-white/10 hover:border-brand-primary/30 transition-colors max-w-full"
    >
      {preview.image ? (
        <img src={preview.image} alt="" className="w-24 h-20 sm:w-32 sm:h-24 object-cover flex-shrink-0" />
      ) : (
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-white/5 flex items-center justify-center">
          <img src={faviconUrl} alt="" className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
      )}
      <div className="p-3 flex flex-col justify-center gap-0.5 min-w-0 overflow-hidden">
        <p className="text-xs text-slate-500 truncate">{preview.siteName ?? hostname}</p>
        <p className="text-sm font-medium line-clamp-1">{preview.title}</p>
        {preview.description && (
          <p className="text-xs text-slate-400 line-clamp-1">{preview.description}</p>
        )}
      </div>
    </a>
  )
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
  const indent = comment.depth * 20
  const urls = extractUrls(comment.content)

  return (
    <div style={{ marginLeft: indent }} className="flex flex-col gap-2">
      <div className={`p-4 rounded-lg ${comment.is_blinded ? 'bg-red-900/10 border border-red-500/30' : 'bg-white/5 border border-white/5'}`}>
        {comment.is_blinded ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>🚫</span>
            <span className="italic">블라인드 처리된 댓글입니다.</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {comment.user_id ? (
                  <span className="text-sm font-medium">👤 회원</span>
                ) : (
                  <>
                    <span className="text-sm font-medium text-slate-400">🎭 {comment.anonymous_name}</span>
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
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{comment.content}</p>
            {/* Link Previews */}
            {urls.map((url, i) => <LinkPreviewCard key={i} url={url} />)}
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

export default function CommunityComments({
  tagId,
  tagName,
}: {
  tagId: string
  tagName: string
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'anon' | 'login'>('anon')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyDepth, setReplyDepth] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 10
  const supabase = createClient()

  useEffect(() => {
    fetchComments()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) setMode('login')
    })
  }, [page])

  const fetchComments = async () => {
    // Get total
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId)
      .is('parent_id', null)
    setTotal(count ?? 0)

    // Fetch all comments (for tree), sorted newest first
    const { data } = await supabase
      .from('comments')
      .select('id, content, anonymous_name, anonymous_ip, user_id, parent_id, depth, is_blinded, created_at')
      .eq('tag_id', tagId)
      .order('created_at', { ascending: false })

    if (data) setComments(data as Comment[])
  }

  const handleReply = useCallback((parentId: string, depth: number) => {
    if (replyingTo === parentId) { setReplyingTo(null); setReplyDepth(0) }
    else { setReplyingTo(parentId); setReplyDepth(depth + 1) }
  }, [replyingTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content.length > MAX_CHARS) return
    setLoading(true)
    setNotice(null)

    try {
      const payload: Record<string, unknown> = {
        tag_id: tagId,
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

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (!res.ok) {
        setNotice(`❌ 오류: ${result.error ?? '글 등록에 실패했습니다.'}`)
        setLoading(false)
        return
      }

      if (result.is_blinded) {
        setNotice('⚠️ 부적절한 표현이 감지되어 블라인드 처리되었습니다.')
      } else {
        setNotice('✅ 글이 등록되었습니다!')
        setTimeout(() => setNotice(null), 3000)
      }

      setContent('')
      setReplyingTo(null)
      setReplyDepth(0)
      fetchComments()
    } catch (err) {
      setNotice(`❌ 네트워크 오류: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
  }

  // Build tree, but only show paginated root comments
  const allRoots = comments.filter(c => !c.parent_id)
  const paginatedRoots = allRoots.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.max(1, Math.ceil(allRoots.length / perPage))

  // Reconstruct tree for paginated roots
  const rootIds = new Set(paginatedRoots.map(r => r.id))
  const relevantComments = comments.filter(c => {
    if (rootIds.has(c.id)) return true
    // Include children of paginated roots
    let parent = c.parent_id
    while (parent) {
      if (rootIds.has(parent)) return true
      const p = comments.find(x => x.id === parent)
      parent = p?.parent_id ?? null
    }
    return false
  })
  const tree = buildTree(relevantComments)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold flex items-center gap-2">
          💬 커뮤니티 토크 <span className="text-sm font-normal text-slate-400">({total}개)</span>
        </h3>
      </div>

      {/* Write form — at the top for community boards */}
      <form onSubmit={handleSubmit} className="bento-card p-5 flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setMode('anon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'anon' ? 'bg-slate-600 text-white' : 'bg-white/5 text-slate-400'}`}>
            🎭 익명
          </button>
          {user ? (
            <button type="button" onClick={() => setMode('login')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'login' ? 'bg-brand-primary/30 text-brand-primary' : 'bg-white/5 text-slate-400'}`}>
              👤 {user.email?.split('@')[0]}
            </button>
          ) : (
            <button type="button" onClick={handleGoogleLogin}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:bg-white/10 transition-colors">
              Google 로그인
            </button>
          )}
        </div>

        {replyingTo && (
          <div className="flex items-center gap-2 text-sm text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-lg">
            <span>↳ 답글 작성 중</span>
            <button onClick={() => { setReplyingTo(null); setReplyDepth(0) }} className="ml-auto text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder={`${tagName} 게시판에 글을 남겨보세요... (링크를 넣으면 미리보기가 생성됩니다)`}
            rows={4}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-brand-primary text-sm resize-none"
          />
          <span className={`absolute bottom-2 right-3 text-xs ${content.length > MAX_CHARS * 0.9 ? 'text-red-400' : 'text-slate-600'}`}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>

        {notice && <div className="text-sm text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-lg">{notice}</div>}

        <button type="submit" disabled={loading || !content.trim() || content.length > MAX_CHARS} className="btn-primary py-2 disabled:opacity-50">
          {loading ? '등록 중...' : replyingTo ? '답글 등록' : '글 등록'}
        </button>
      </form>

      {/* Comment list — newest first */}
      <div className="flex flex-col gap-3">
        {tree.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">아직 글이 없습니다. 첫 번째 글을 남겨보세요! 🎉</p>
        ) : (
          tree.map(comment => (
            <CommentNode key={comment.id} comment={comment} onReply={handleReply} replyingTo={replyingTo} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center gap-2 mt-2">
          {page > 1 && (
            <button onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors">
              ← 이전
            </button>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                p === page ? 'bg-brand-primary text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
          {page < totalPages && (
            <button onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors">
              다음 →
            </button>
          )}
        </nav>
      )}
    </section>
  )
}
