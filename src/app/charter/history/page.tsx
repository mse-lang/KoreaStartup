import Link from 'next/link';
import { readCharterMarkdown } from '@/lib/charter';

export default async function CharterHistoryPage() {
  const md = await readCharterMarkdown('history.md');
  const lines = md.split(/\r?\n/).filter(Boolean).filter(line => !line.startsWith('# '));

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">헌장 개정 이력</h1>
        <Link href="/charter" className="text-sm px-3 py-1.5 rounded-full bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">
          ← 헌장
        </Link>
      </div>
      <div className="grid gap-3">
        {lines.map((line) => (
          <div key={line} className="bento-card p-5 rounded-2xl border border-white/10 bg-white/5">
            <span className="text-slate-300">{line.replace(/^[-•]\s*/, '')}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
