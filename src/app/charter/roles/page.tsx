import Link from 'next/link';

const roles = [
  ['기획', '문서 구조, 버전 정책, 공개 범위 관리'],
  ['작성', '헌장 본문과 세부 원칙 갱신'],
  ['렌더링', '포털 내 노출과 네비게이션 연결'],
  ['동기화', 'Docs → HTML/MD 반영 자동화'],
  ['검수', '개정 내용과 공개 범위 확인'],
];

export default function CharterRolesPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">헌장 역할맵</h1>
        <Link href="/charter" className="text-sm px-3 py-1.5 rounded-full bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">
          ← 헌장
        </Link>
      </div>
      <div className="grid gap-3">
        {roles.map(([role, desc]) => (
          <div key={role} className="bento-card p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <strong>{role}</strong>
            <span className="text-slate-300">{desc}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
