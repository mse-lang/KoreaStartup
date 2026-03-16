'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />
  }

  if (!user) {
    return (
      <Link href="/login" className="btn-primary !py-1.5 !px-3 !text-sm">
        로그인
      </Link>
    )
  }

  const displayName = user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.email?.split('@')[0]
    || '사용자'

  const avatar = user.user_metadata?.avatar_url

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-5 h-5 rounded-full" />
        ) : (
          <span className="w-5 h-5 rounded-full bg-brand-primary/30 flex items-center justify-center text-xs">
            {displayName[0]}
          </span>
        )}
        <span className="max-w-24 truncate text-xs font-medium">{displayName}</span>
        <svg className={`w-3 h-3 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-slate-300 hover:bg-white/5 transition-colors"
          >
            🛠️ 관리자 대시보드
          </Link>
          <Link
            href="/admin/profile"
            onClick={() => setOpen(false)}
            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-slate-300 hover:bg-white/5 transition-colors"
          >
            👤 내 프로필
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
          >
            🔓 로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
