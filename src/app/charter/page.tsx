import Link from 'next/link';
import { readCharterMarkdown, splitMarkdownSections } from '@/lib/charter';

export default async function CharterPage() {
  const md = await readCharterMarkdown('current.md');
  const sections = splitMarkdownSections(md);

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-slate-400 mb-2">Startupsquare.net Charter</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">AI 헌장</h1>
        </div>
        <Link href="/" className="text-sm px-3 py-1.5 rounded-full bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">
          ← 홈
        </Link>
      </div>

      <section className="grid gap-4">
        {sections.map((section) => (
          <article key={section.title} className="bento-card p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
            <p className="text-slate-300 leading-7 whitespace-pre-line">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 flex gap-3 flex-wrap">
        <Link href="/charter/history" className="px-4 py-2 rounded-full bg-brand-primary text-white text-sm font-medium">
          개정 이력
        </Link>
        <Link href="/charter/roles" className="px-4 py-2 rounded-full bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/10">
          역할맵
        </Link>
      </section>
    </main>
  );
}
