'use client';

import { useState } from 'react';

interface BookmarkButtonProps {
  articleId: string;
  initialBookmarked?: boolean;
}

export default function BookmarkButton({ articleId, initialBookmarked = false }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={bookmarked ? '스크랩 해제' : '스크랩'}
      className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
        bookmarked
          ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/20 hover:text-white'
      } ${loading ? 'opacity-50' : ''}`}
    >
      {bookmarked ? (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z" />
        </svg>
      )}
    </button>
  );
}
