import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { COMMUNITY_TAGS } from '@/lib/tag-rules';

const COMMUNITY_SLUGS = COMMUNITY_TAGS.map(t => t.slug);

// Simple seeded shuffle for server components (changes per request)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface TagNavProps {
  activeSlug?: string;
}

export default async function TagNav({ activeSlug }: TagNavProps) {
  const supabase = await createClient();

  // Fetch all tags (no limit — tags grow over time)
  const { data: allTags } = await supabase
    .from('tags')
    .select('name, slug, article_count');

  if (!allTags || allTags.length === 0) return null;

  // Community tags (emoji) — pinned first, order by slug for consistency
  const communityTags = allTags
    .filter(t => COMMUNITY_SLUGS.includes(t.slug))
    .sort((a, b) => COMMUNITY_SLUGS.indexOf(a.slug) - COMMUNITY_SLUGS.indexOf(b.slug));

  // Regular tags — randomized every page load
  const regularTags = shuffle(allTags.filter(t => !COMMUNITY_SLUGS.includes(t.slug)));

  return (
    <nav className="flex gap-1.5 flex-wrap items-center -mt-2">
      {/* Home link */}
      <Link
        href="/"
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          !activeSlug ? 'bg-brand-primary text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
        }`}
      >
        🏠 전체
      </Link>

      {/* Search link */}
      <Link
        href="/search"
        className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-400 hover:bg-white/10 transition-colors"
      >
        🔍 검색
      </Link>

      {/* Community tags — always pinned with special styling */}
      {communityTags.map((t) => (
        <Link
          key={t.slug}
          href={`/tag/${t.slug}`}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            t.slug === activeSlug
              ? 'bg-yellow-500 text-black font-bold'
              : 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/20'
          }`}
        >
          {t.name}
        </Link>
      ))}

      {/* Separator */}
      {communityTags.length > 0 && regularTags.length > 0 && (
        <span className="text-white/10 self-center">|</span>
      )}

      {/* Regular tags — randomized */}
      {regularTags.slice(0, 12).map((t) => (
        <Link
          key={t.slug}
          href={`/tag/${t.slug}`}
          className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
            t.slug === activeSlug
              ? 'bg-brand-primary text-white'
              : 'bg-white/5 text-slate-400 hover:bg-brand-primary/20 hover:text-brand-primary'
          }`}
        >
          #{t.name}
        </Link>
      ))}
    </nav>
  );
}
