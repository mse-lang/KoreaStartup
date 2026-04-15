import Link from 'next/link';

const items = [
  ['2026-04-16', '헌장 전용 라우트 초기 생성'],
  ['다음 단계', 'Google Docs 또는 MD 원본 동기화 연결'],
];

export default function CharterHistoryPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">헌장 개정 이력</h1>
        <Link href="/charter" className="text-sm px-3 py-1.5 rounded-full bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">
          ← 헌장
        </Link>
      </div>
      <div className="grid gap-3">
        {items.map(([date, text]) => (
          <div key={date} className="bento-card p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <strong>{date}</strong>
            <span className="text-slate-300">{text}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
