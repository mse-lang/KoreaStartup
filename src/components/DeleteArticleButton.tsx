'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteArticleButton({ articleId, articleTitle }: { articleId: string, articleTitle: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`정말 "${articleTitle}" 기사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('삭제 실패');
      }
      router.refresh(); // Refresh the page to show updated list
    } catch (err) {
      alert('기사 삭제 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-sm bg-red-500/20 text-red-500 rounded-md hover:bg-red-500/30 transition-colors disabled:opacity-50"
      title="삭제"
    >
      {isDeleting ? '⏳' : '🗑️'}
    </button>
  );
}
