'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">👤 내 프로필</h1>
        <p className="text-slate-400 mt-1 text-sm">계정 정보, 정산 설정 및 내 기사 통계</p>
      </div>

      <ProfileInfo />

      <div className="bento-card p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">보안 및 설정</h2>
        <p className="text-sm text-slate-400">기기에서 안전하게 로그아웃하고 세션을 종료합니다.</p>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="btn-primary bg-brand-error hover:bg-red-600 w-fit transition-colors disabled:opacity-50"
        >
          {loading ? '로그아웃 중...' : '🔓 로그아웃'}
        </button>
      </div>
    </div>
  )
}

function ProfileInfo() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ totalArticles: 0, totalRevenue: 0 })
  const [isLoading, setIsLoading] = useState(true)

  // Bank Form State
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [savingBank, setSavingBank] = useState(false)

  const [verifying, setVerifying] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      
      // Fetch Author Profile
      const { data: profData } = await supabase
        .from('author_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profData) {
        setProfile(profData)
        setBankName(profData.bank_name || '')
        setAccountNumber(profData.account_number || '')
        setAccountHolder(profData.account_holder || '')
      }

      // Fetch Stats
      fetch('/api/profile/stats')
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setStats({ totalArticles: data.totalArticles, totalRevenue: data.totalRevenue })
          }
        })
    }
    setIsLoading(false)
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const res = await fetch('/api/profile/verify', { method: 'POST' })
      if (!res.ok) throw new Error('인증 실패')
      alert('본인인증이 완료되었습니다.')
      fetchData() // Refresh
    } catch (err: any) {
      alert(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBank(true)
    try {
      const res = await fetch('/api/profile/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_name: bankName, account_number: accountNumber, account_holder: accountHolder })
      })
      if (!res.ok) throw new Error('저장 실패')
      alert('계좌 정보가 저장되었습니다.')
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingBank(false)
    }
  }

  if (isLoading) return <div className="animate-pulse h-48 rounded-lg bg-white/5" />
  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Account Basics & Verification */}
      <div className="bento-card p-6 flex flex-col gap-5">
        <h2 className="text-lg font-semibold flex items-center justify-between">
          계정 기본 정보
          {profile?.is_verified ? (
            <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">✓ 본인인증 완료</span>
          ) : (
            <span className="text-sm bg-red-400/20 text-red-400 px-3 py-1 rounded-full border border-red-400/30">! 본인인증 미완료</span>
          )}
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-black/20 rounded-lg border border-white/5">
            <p className="text-xs text-slate-400 mb-1">이메일 주소</p>
            <p className="text-lg font-bold truncate">{user.email}</p>
          </div>
          <div className="p-4 bg-black/20 rounded-lg border border-white/5 flex flex-col justify-center items-start">
            <p className="text-xs text-slate-400 mb-1">크리에이터 인증 상태</p>
            {!profile?.is_verified ? (
              <button 
                onClick={handleVerify} 
                disabled={verifying}
                className="text-sm bg-brand-primary text-black font-bold px-4 py-2 rounded-lg hover:bg-brand-primary/80 transition-colors mt-2"
              >
                {verifying ? '인증 진행 중...' : '휴대폰 본인인증 진행하기'}
              </button>
            ) : (
              <p className="text-sm font-medium mt-2">유료 기사를 작성할 수 있는 인증된 계정입니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bento-card p-6 flex flex-col gap-5 border-brand-primary/30">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          📊 내 기사 통계
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-brand-primary/10 rounded-lg border border-brand-primary/20 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-brand-primary mb-2 font-medium">총 작성 기사</p>
            <p className="text-4xl font-black">{stats.totalArticles}개</p>
          </div>
          <div className="p-6 bg-brand-primary/10 rounded-lg border border-brand-primary/20 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-brand-primary mb-2 font-medium">누적 정산(예정) 금액</p>
            <p className="text-4xl font-black">{stats.totalRevenue.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      {/* Bank Account Details */}
      {profile?.is_verified && (
        <div className="bento-card p-6 flex flex-col gap-5">
          <h2 className="text-lg font-semibold">💰 정산 계좌 정보</h2>
          <p className="text-sm text-slate-400 mb-2">유료 기사 판매 금액(40%)을 정산받을 계좌를 입력해주세요.</p>
          <form onSubmit={handleSaveBank} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">은행명</label>
                <input 
                  required
                  type="text" 
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="예: 토스뱅크"
                  className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">계좌번호 (- 제외)</label>
                <input 
                  required
                  type="text" 
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="100012345678"
                  className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">예금주</label>
                <input 
                  required
                  type="text" 
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value)}
                  placeholder="홍길동"
                  className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={savingBank}
              className="mt-2 w-full sm:w-auto self-end bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-2 rounded-lg text-sm transition-colors"
            >
              {savingBank ? '저장 중...' : '계좌 정보 저장하기'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
