'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DeleteArticleButton from '@/components/DeleteArticleButton';
import { useRouter } from 'next/navigation';

interface ArticleItem {
  id: string;
  title: string;
  source_name: string;
  summary_5lines: string | null;
  created_at: string;
}

export default function ArticleListClient({ initialArticles }: { initialArticles: ArticleItem[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(initialArticles.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 기사를 영구 삭제하시겠습니까?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/articles/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      if (!res.ok) {
        throw new Error('일괄 삭제 실패');
      }
      
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      alert('기사 일괄 삭제 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (initialArticles.length === 0) {
    return (
      <div className="bento-card p-12 text-center">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-slate-400 mb-4">아직 등록된 기사가 없습니다</p>
        <Link href="/admin/articles/new" className="btn-primary">
          첫 번째 기사 작성하기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {selectedIds.size > 0 && (
        <div className="flex justify-between items-center bg-brand-primary/10 border border-brand-primary/20 p-3 rounded-lg">
          <span className="text-sm font-medium text-brand-primary">{selectedIds.size}개 일괄 선택됨</span>
          <button 
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded flex items-center gap-1 disabled:opacity-50"
          >
            {isDeleting ? '⏳ 처리 중...' : `🗑️ 선택 삭제 (${selectedIds.size})`}
          </button>
        </div>
      )}

      <div className="bento-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-400">
              <th className="p-4 font-medium w-12 text-center">
                <input 
                  type="checkbox" 
                  className="rounded border-white/20 bg-slate-900 focus:ring-brand-primary/50 text-brand-primary"
                  checked={initialArticles.length > 0 && selectedIds.size === initialArticles.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="p-4 font-medium">제목</th>
              <th className="p-4 font-medium w-32">출처</th>
              <th className="p-4 font-medium w-40">등록일</th>
              <th className="p-4 font-medium w-28 text-center">작업</th>
            </tr>
          </thead>
          <tbody>
            {initialArticles.map((article) => (
              <tr key={article.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-white/20 bg-slate-900 focus:ring-brand-primary/50 text-brand-primary"
                    checked={selectedIds.has(article.id)}
                    onChange={() => handleSelect(article.id)}
                  />
                </td>
                <td className="p-4">
                  <p className="font-medium">{article.title}</p>
                  {article.summary_5lines && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{article.summary_5lines}</p>
                  )}
                </td>
                <td className="p-4 text-slate-400">{article.source_name}</td>
                <td className="p-4 text-slate-400">
                  {new Date(article.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-center">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="p-2 text-sm bg-brand-primary/20 text-brand-primary rounded-md hover:bg-brand-primary/30 transition-colors"
                      title="수정"
                    >
                      ✏️
                    </Link>
                    <Link
                      href={`/article/${article.id}`}
                      className="p-2 text-sm bg-white/10 text-slate-300 rounded-md hover:bg-white/20 transition-colors"
                      target="_blank"
                      title="미리보기"
                    >
                      👁️
                    </Link>
                    <DeleteArticleButton articleId={article.id} articleTitle={article.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
