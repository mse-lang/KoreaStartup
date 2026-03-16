'use client';

import { useState } from 'react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || '구독 완료! 🎉');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || '오류가 발생했습니다');
      }
    } catch {
      setStatus('error');
      setMessage('네트워크 오류가 발생했습니다');
    }
  };

  return (
    <section className="bento-card p-6 sm:p-8 relative overflow-hidden">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-transparent to-purple-500/10 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📬 AI 큐레이션 뉴스레터
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            매일 아침, AI가 선별한 스타트업 핵심 뉴스를 이메일로 받아보세요.
          </p>
        </div>

        {status === 'success' ? (
          <div className="flex items-center gap-2 text-green-400 font-medium text-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소 입력"
              required
              className="flex-1 sm:w-64 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/30 transition-all"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-primary whitespace-nowrap text-sm px-4"
            >
              {status === 'loading' ? '...' : '무료 구독'}
            </button>
          </form>
        )}
      </div>

      {status === 'error' && (
        <p className="relative z-10 text-xs text-red-400 mt-2">{message}</p>
      )}
    </section>
  );
}
