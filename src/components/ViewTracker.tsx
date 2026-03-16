'use client';

import { useEffect } from 'react';

export default function ViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    // Fire-and-forget view count increment
    fetch(`/api/articles/${articleId}/view`, { method: 'POST' }).catch(() => {});
  }, [articleId]);

  return null; // invisible component
}
