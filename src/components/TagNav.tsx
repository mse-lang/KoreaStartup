import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { COMMUNITY_TAGS } from '@/lib/tag-rules';

const COMMUNITY_SLUGS = COMMUNITY_TAGS.map(t => t.slug);
// Premium is handled as a special pinned tag, not in community section
const COMMUNITY_SLUGS_DISPLAY = COMMUNITY_SLUGS.filter(s => s !== 'premium');

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

  // Fetch tags that appear on recent articles (last 7 days) for relevance
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recentArticleTags } = await supabase
    .from('article_tags')
    .select('tag_id, tags(name, slug, article_count), articles!inner(created_at)')
    .gte('articles.created_at', weekAgo);

  // Deduplicate tags and track recency
  const tagMap = new Map<string, { name: string; slug: string; article_count: number }>();
  for (const at of recentArticleTags || []) {
    const tag = Array.isArray(at.tags) ? at.tags[0] : at.tags;
    if (tag && !tagMap.has(tag.slug)) {
      tagMap.set(tag.slug, { name: tag.name, slug: tag.slug, article_count: tag.article_count ?? 0 });
    }
  }

  // Also fetch all tags as fallback (in case recent articles have few tags)
  const { data: allTags } = await supabase
    .from('tags')
    .select('name, slug, article_count');

  const allTagsList = allTags || [];

  // Community tags (emoji) — pinned, but exclude 'premium' (it has its own button)
  const communityTags = allTagsList
    .filter(t => COMMUNITY_SLUGS_DISPLAY.includes(t.slug))
    .sort((a, b) => COMMUNITY_SLUGS_DISPLAY.indexOf(a.slug) - COMMUNITY_SLUGS_DISPLAY.indexOf(b.slug));

  // Recent article tags (non-community) — randomized
  const recentRegularTags = shuffle(
    Array.from(tagMap.values()).filter(t => !COMMUNITY_SLUGS.includes(t.slug))
  );

  // Fallback: if not enough recent tags, add from allTags
  const recentSlugs = new Set(recentRegularTags.map(t => t.slug));
  const fallbackTags = shuffle(
    allTagsList.filter(t => !COMMUNITY_SLUGS.includes(t.slug) && !recentSlugs.has(t.slug))
  );

  const displayTags = [...recentRegularTags, ...fallbackTags].slice(0, 12);

  return (
    <nav className="tag-nav-scroll flex gap-1.5 flex-wrap items-center -mt-2">
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

      {/* Premium tag — always pinned */}
      <Link
        href="/tag/premium"
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          activeSlug === 'premium'
            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/30'
            : 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/30'
        }`}
      >
        💎 프리미엄
      </Link>

      {/* Community tags — always pinned with special styling (excluding premium) */}
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
      {communityTags.length > 0 && displayTags.length > 0 && (
        <span className="text-white/10 self-center">|</span>
      )}

      {/* Regular tags — from recent articles, randomized */}
      {displayTags.map((t) => (
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
