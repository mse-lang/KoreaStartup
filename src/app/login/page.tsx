'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setError('이메일을 확인하여 계정 인증을 완료해주세요.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bento-card p-8 w-full max-w-md flex flex-col gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">환영합니다</h1>
          <p className="text-sm text-slate-400">KoreaStartup.kr에 오신 것을 환영합니다</p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            type="button" 
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${location.origin}/auth/callback`
                }
              });
              if (error) setError(error.message);
            }}
            className="w-full flex items-center justify-center gap-3 bg-white text-black py-2.5 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google 계정으로 계속
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#1a1c23] px-2 text-slate-500">또는 이메일로 계속</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300" htmlFor="email">이메일 주소</label>
            <input 
              id="email"
              type="email" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300" htmlFor="password">비밀번호</label>
            <input 
              id="password"
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
            />
          </div>

          {error && <div className="text-red-400 text-sm p-2 bg-red-400/10 rounded-lg">{error}</div>}

          <div className="flex flex-col gap-3 mt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
            <button 
              type="button" 
              onClick={handleSignUp}
              disabled={loading || !email || !password}
              className="bg-white/5 border border-white/10 hover:bg-white/10 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              새 계정 만들기
            </button>
          </div>
        </form>

        <div className="text-center mt-2">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← 메인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
