import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold bg-gradient-to-br from-brand-primary to-purple-400 bg-clip-text text-transparent">404</p>
        <h1 className="text-2xl font-bold mt-4">페이지를 찾을 수 없습니다</h1>
        <p className="text-slate-400 mt-3 text-sm leading-relaxed">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Link href="/" className="btn-primary">🏠 홈으로</Link>
          <Link href="/search" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">
            🔍 검색하기
          </Link>
        </div>
      </div>
    </div>
  );
}
