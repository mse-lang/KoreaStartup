'use client';

import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold bg-gradient-to-br from-red-500 to-orange-400 bg-clip-text text-transparent">500</p>
        <h1 className="text-2xl font-bold mt-4">오류가 발생했습니다</h1>
        <p className="text-slate-400 mt-3 text-sm leading-relaxed">
          페이지를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <button onClick={reset} className="btn-primary">🔄 다시 시도</button>
          <Link href="/" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">
            🏠 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
