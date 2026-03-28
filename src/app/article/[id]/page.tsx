import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CommentSection from '@/components/CommentSection';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/UserMenu';
import TagNav from '@/components/TagNav';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TossPaymentWidget from '@/components/TossPaymentWidget';
import ShareButtons from '@/components/ShareButtons';
import BookmarkButton from '@/components/BookmarkButton';
import ViewTracker from '@/components/ViewTracker';
import ArticleQnA from '@/components/ArticleQnA';
import ArticleTagInput from '@/components/ArticleTagInput';
import AISummaryCard from '@/components/AISummaryCard';
import type { Metadata } from 'next';

// SEO: Dynamic metadata for each article
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase.from('articles').select('title, summary_5lines, og_image_url, source_name').eq('id', id).single();

  if (!article) return { title: '기사를 찾을 수 없습니다' };

  const description = article.summary_5lines?.split('\n')[0]?.replace(/^\d+\.\s*/, '') || `${article.source_name} 기사`;

  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      ...(article.og_image_url ? { images: [{ url: article.og_image_url, width: 1200, height: 630 }] } : {}),
      type: 'article',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
    },
  };
}

// Decode HTML entities
function decodeEntities(text: string): string {
  return text
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8216;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#038;/g, '&').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '') // remove remaining numeric entities
}

// Check if a line is PURELY English (very strict — only filter obviously translated blocks)
function isPurelyEnglish(text: string): boolean {
  // Strip all punctuation, numbers, spaces
  const stripped = text.replace(/[\s\d.,!?*\-:;'"()\[\]{}@#$%^&+=<>/\\|~`]/g, '')
  // Require minimum 30 meaningful characters to even consider
  if (stripped.length < 30) return false
  // Check if it contains ANY Korean character — if yes, it's not purely English
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(stripped)) return false
  // Only filter if it's 95%+ ASCII letters
  const asciiChars = stripped.replace(/[^a-zA-Z]/g, '').length
  return asciiChars / stripped.length > 0.95
}

// Clean up raw content from RSS/Jina Reader metadata
function cleanContentForMarkdown(raw: string): string {
  const decoded = decodeEntities(raw);
  
  // Basic metadata removal
  const lines = decoded.split('\n');
  const cleaned: string[] = [];
  
  for (const line of lines) {
    let trimmed = line.trim();
    if (trimmed.startsWith('Title:')) continue;
    if (trimmed.startsWith('URL Source:')) continue;
    if (trimmed.startsWith('Published Time:')) continue;
    if (trimmed.startsWith('Markdown Content:')) continue;
    
    // Remove specific boilerplate text instead of skipping the entire line
    trimmed = trimmed.replace(/The post .* appeared first on .*/g, '');
    trimmed = trimmed.replace(/.*editor@venturesquare\.net.*/g, '');
    trimmed = trimmed.replace(/.*기고문 형태로 공유하고자 하는 분이 있다면.*/g, '');
    trimmed = trimmed.trim();

    if (!trimmed) {
      // Preserve empty lines as paragraph breaks
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== '') {
        cleaned.push('');
      }
      continue;
    }
    
    // Skip purely English translated blocks for Korean startup news
    if (isPurelyEnglish(trimmed)) continue;
    
    // If a line is very long (>200 chars) and has no line breaks,
    // try to split it into paragraphs at Korean sentence endings
    if (trimmed.length > 200 && !trimmed.match(/^#{1,6}\s/) && !trimmed.match(/^[\*\-]\s/)) {
      // Split at sentence endings followed by a space and a new sentence
      // Korean sentences typically end with 다. 요. 음. etc.
      const sentences = trimmed.split(/(?<=[다요음임됨함했됐겠움짐났겼있없했]\.)\s+/);
      if (sentences.length > 1) {
        // Group every 2-3 sentences into a paragraph
        for (let i = 0; i < sentences.length; i++) {
          const sentence = sentences[i].trim();
          if (!sentence) continue;
          cleaned.push(sentence);
          // Add paragraph break after every 2-3 sentences
          if ((i + 1) % 3 === 0 || i === sentences.length - 1) {
            cleaned.push('');
          }
        }
        continue;
      }
    }
    
    cleaned.push(trimmed);
    // Force paragraph break after non-header/list lines
    if (!trimmed.match(/^#{1,6}\s/) && !trimmed.match(/^[\*\-]\s/)) {
      cleaned.push('');
    }
  }
  
  // Clean up excessive empty lines (max 2 consecutive)
  const result: string[] = [];
  let emptyCount = 0;
  for (const line of cleaned) {
    if (line === '') {
      emptyCount++;
      if (emptyCount <= 1) result.push(line);
    } else {
      emptyCount = 0;
      result.push(line);
    }
  }
  
  return result.join('\n');
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (!article) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col items-center justify-center gap-6">
        <p className="text-6xl">📭</p>
        <h1 className="text-2xl font-bold">기사를 찾을 수 없습니다</h1>
        <p className="text-slate-400">요청하신 기사가 존재하지 않거나 삭제되었습니다.</p>
        <Link href="/" className="btn-primary mt-4">홈으로 돌아가기</Link>
      </div>
    );
  }

  // Check subscription / premium status
  let isPremium = false;
  if (user) {
    // Admins bypass
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'super_admin' || profile?.role === 'editor') {
      isPremium = true;
    } else {
      // Check active subscriptions table if it exists
      try {
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('status, expires_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        if (sub) {
          isPremium = true;
        }
      } catch (e) {
        // Migration might not have run on vercel db, fail gracefully to false
        console.warn('Subscription check error', e);
      }
    }
  }

  const fullMarkdownContent = cleanContentForMarkdown(article.content_raw || '');
  
  // Reading time estimate (avg 400 chars/min for Korean)
  const readingTime = Math.max(1, Math.ceil((article.content_raw?.length || 0) / 400));
  
  // Decide how much to show based on source & premium status
  const isOriginalPremium = article.category === 'user-generated' || article.is_premium;
  const isPaywalled = isOriginalPremium && !isPremium;
  
  let previewContent = fullMarkdownContent;
  let hiddenContent = '';
  let showReadMoreOutlink = false;

  if (isOriginalPremium) {
    const lines = fullMarkdownContent.split('\n');
    const previewCutoff = Math.max(8, Math.floor(lines.length * 0.3));
    previewContent = isPaywalled ? lines.slice(0, previewCutoff).join('\n') : fullMarkdownContent;
    hiddenContent = isPaywalled ? lines.slice(previewCutoff).join('\n') : '';
  } else {
    const sentences = fullMarkdownContent.match(/[^.!?]+[.!?]+(\s+|$)/g) || [fullMarkdownContent];
    let maxSentences = article.source_name === '벤처스퀘어' ? 15 : Math.floor(Math.random() * 3) + 3;
    if (sentences.length > maxSentences) {
      previewContent = sentences.slice(0, maxSentences).join('').trim();
      showReadMoreOutlink = true;
    }
  }

  const orderId = `premium_${user?.id?.substring(0, 8) ?? 'anon'}_${Date.now()}`;

  // Fetch tag IDs for cross-commenting and related articles
  const { data: articleTagLinks } = await supabase
    .from('article_tags')
    .select('tag_id')
    .eq('article_id', article.id);
  const articleTagIds = articleTagLinks?.map(t => t.tag_id) ?? [];

  // Check if user bookmarked this article
  let isBookmarked = false;
  if (user) {
    const { data: bm } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_id', article.id)
      .maybeSingle();
    isBookmarked = !!bm;
  }

  // Fetch related articles by shared tags
  let relatedArticles: any[] = [];
  if (articleTagIds.length > 0) {
    const { data: relatedLinks } = await supabase
      .from('article_tags')
      .select('article_id, articles(id, title, source_name, og_image_url, created_at)')
      .in('tag_id', articleTagIds)
      .neq('article_id', article.id)
      .limit(12);
    // Dedupe and take top 4
    const seen = new Set<string>();
    for (const rl of relatedLinks || []) {
      const a = Array.isArray(rl.articles) ? rl.articles[0] : rl.articles;
      if (a && !seen.has(a.id)) {
        seen.add(a.id);
        relatedArticles.push(a);
        if (relatedArticles.length >= 4) break;
      }
    }
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Navigation */}
      <nav className="flex justify-between items-center py-3">
        <Link href="/" className="text-sm text-slate-400 hover:text-brand-primary transition-colors flex items-center gap-2">
          ← 홈으로
        </Link>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </nav>

      <TagNav />

      {/* OG Image */}
      {article.og_image_url && (
        <img
          src={article.og_image_url}
          alt={article.title}
          className="w-full h-48 sm:h-64 md:h-80 object-cover rounded-2xl"
        />
      )}

      {/* Article Header */}
      <header className="flex flex-col gap-3">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-xs font-semibold">
            {article.source_name}
          </span>
          {article.author_name && (
            <span className="text-sm text-slate-300 font-medium">
              ✍️ {article.author_name}
            </span>
          )}
          {article.published_at && (
            <span className="text-sm text-slate-400">
              {new Date(article.published_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">{article.title}</h1>
        {/* Tags — interactive */}
        {await (async () => {
          const { data: tagLinks } = await supabase
            .from('article_tags')
            .select('tag_id, tags(id, name, slug)')
            .eq('article_id', article.id);
          const existingTags = (tagLinks || []).map((tl: any) => {
            const t = Array.isArray(tl.tags) ? tl.tags[0] : tl.tags;
            return { id: t?.id ?? tl.tag_id, name: t?.name ?? '', slug: t?.slug ?? '' };
          }).filter((t: any) => t.name);
          return <ArticleTagInput articleId={article.id} existingTags={existingTags} />;
        })()}
      </header>

      {/* Social Share + Bookmark + Reading Time */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShareButtons title={article.title} />
          {user && <BookmarkButton articleId={article.id} initialBookmarked={isBookmarked} />}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>📖 약 {readingTime}분 읽기</span>
          {article.view_count > 0 && <span>👁️ {article.view_count.toLocaleString()}</span>}
        </div>
      </div>

      {/* View Count Tracker (invisible) */}
      <ViewTracker articleId={article.id} />

      {/* AI 5-Line Summary */}
      {article.summary_5lines && (
        <AISummaryCard
          lines={article.summary_5lines
            .split('\n')
            .filter((l: string) => l.trim())
            .map((line: string) => decodeEntities(line.replace(/^\d+\.\s*/, '')))}
        />
      )}

      {/* Article Body — Markdown Rendered */}
      <article className="prose-article relative">
        <h3 className="text-lg font-bold mb-4">📖 원문 기사</h3>
        <div className="prose prose-invert prose-brand max-w-none text-slate-300">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-8 mb-4 text-white" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-6 mb-3 text-white" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-5 mb-2 text-white" {...props} />,
              p: ({node, ...props}) => <p className="mb-5 text-sm sm:text-base leading-relaxed break-keep whitespace-pre-wrap" {...props} />,
              a: ({node, ...props}) => <a className="text-brand-primary hover:underline" target="_blank" rel="noreferrer" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="text-sm sm:text-base leading-relaxed" {...props} />,
              blockquote: ({node, ...props}) => (
                <blockquote className="pl-4 py-1 my-4 border-l-4 border-brand-primary/50 bg-brand-primary/5 rounded-r-lg" {...props} />
              ),
              strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />
            }}
          >
            {previewContent}
          </ReactMarkdown>
          
          {/* Blurred out portion if Paywalled */}
          {isPaywalled && hiddenContent && (
            <div className="relative mt-2">
              <div className="select-none pointer-events-none blur-sm opacity-50 overflow-hidden max-h-[400px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {hiddenContent}
                </ReactMarkdown>
              </div>
              <TossPaymentWidget articleId={article.id} orderId={orderId} isLoggedIn={!!user} />
            </div>
          )}
          
          {/* Read More Section for Truncated External Content */}
          {showReadMoreOutlink && (
            <div className="relative mt-4">
              <div className="absolute bottom-full left-0 w-full h-24 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
              <a 
                href={article.source_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block w-full text-center py-4 bg-white/5 hover:bg-white/10 text-brand-primary border border-brand-primary/30 rounded-lg transition-colors font-medium shadow-lg"
              >
                ... 계속 읽기 (더보기) ↗
              </a>
            </div>
          )}
        </div>
      </article>

      <hr className="border-white/10 my-2" />

      {/* AI 관련 기사 추천 */}
      {relatedArticles.length > 0 && (
        <section className="mt-2">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="text-brand-primary">🤖</span> AI 추천 관련 기사
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedArticles.map((ra: any) => (
              <Link
                key={ra.id}
                href={`/article/${ra.id}`}
                className="bento-card p-0 flex overflow-hidden hover:-translate-y-1 hover:border-brand-primary/30 transition-all group block"
              >
                {ra.og_image_url ? (
                  <img src={ra.og_image_url} alt={ra.title} className="w-24 h-20 object-cover flex-shrink-0" />
                ) : (
                  <div className="w-24 h-20 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-2xl flex-shrink-0">📰</div>
                )}
                <div className="p-3 flex-1">
                  <h4 className="text-sm font-medium line-clamp-2 group-hover:text-brand-primary transition-colors">{ra.title}</h4>
                  <span className="text-xs text-slate-500 mt-1 block">{ra.source_name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <hr className="border-white/10 my-2" />

      {/* AI Q&A Chatbot */}
      <ArticleQnA articleId={article.id} articleTitle={article.title} />

      {/* Comments Section */}
      <CommentSection articleId={article.id} tagIds={articleTagIds} />

      {/* Footer & Original Link — only show if no inline "계속 읽기" link */}
      {!showReadMoreOutlink && (
        <footer className="mt-4 flex flex-col gap-4">
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full text-center py-3 sm:py-4 text-base sm:text-lg"
          >
            해당 기사 원문 보기 ({article.source_name}) ↗
          </a>
        </footer>
      )}
    </div>
  );
}
