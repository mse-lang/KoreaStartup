import Link from 'next/link';

const sections = [
  {
    title: '헌장 개요',
    body: '스타트업스퀘어의 헌장은 포털 내부에서 읽히는 공식 원칙 문서다. 외부 문서처럼 분리하지 않고 서비스의 일부로 보이게 둔다.',
  },
  {
    title: '역할',
    body: '원본 작성은 Docs 또는 MD, 포털은 렌더링과 노출만 담당한다. 개정 이력은 별도 경로로 남긴다. 나중에 실제 동기화만 얹으면 된다.',
  },
  {
    title: '운영 원칙',
    body: '요약, 정책, 역할맵, 히스토리는 분리하고, 메인 문서와 같이 유지한다. 나중에 CMS나 동기화 파이프라인을 붙이기 쉽게 둔다.',
  },
];

export default function CharterPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-slate-400 mb-2">Startupsquare Charter</p>
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
            <p className="text-slate-300 leading-7">{section.body}</p>
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
