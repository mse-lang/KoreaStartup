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

    if (!trimmed) continue;
    
    // Skip purely English translated blocks for Korean startup news
    if (isPurelyEnglish(trimmed)) continue;
    
    // Add double newlines for proper markdown paragraph breaks if not headers/lists
    if (trimmed !== '' && !trimmed.match(/^#{1,6}\s/) && !trimmed.match(/^[\*\-]\s/)) {
        cleaned.push(trimmed);
        cleaned.push(''); // Force line break
    } else {
        cleaned.push(trimmed);
    }
  }
  
  return cleaned.join('\n');
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
  
  // Decide how much to show based on source & premium status
  const isOriginalPremium = article.category === 'user-generated' || article.is_premium;
  const isPaywalled = isOriginalPremium && !isPremium;
  
  let previewContent = fullMarkdownContent;
  let hiddenContent = '';
  let showReadMoreOutlink = false;

  if (isOriginalPremium) {
    // Premium article logic (blur the rest)
    const lines = fullMarkdownContent.split('\n');
    const previewCutoff = Math.max(8, Math.floor(lines.length * 0.3)); // Show first ~30%
    previewContent = isPaywalled ? lines.slice(0, previewCutoff).join('\n') : fullMarkdownContent;
    hiddenContent = isPaywalled ? lines.slice(previewCutoff).join('\n') : '';
  } else {
    // External RSS Article Logic: Truncate by sentences
    // Split by sentence endings (., !, ?) followed by space or newline
    const sentences = fullMarkdownContent.match(/[^.!?]+[.!?]+(\s+|$)/g) || [fullMarkdownContent];
    
    // Determine max sentences
    let maxSentences = article.source_name === '벤처스퀘어' ? 15 : Math.floor(Math.random() * 3) + 3; // 3~5 sentences
    
    if (sentences.length > maxSentences) {
      previewContent = sentences.slice(0, maxSentences).join('').trim();
      showReadMoreOutlink = true;
    }
  }

  // Generate unique order ID for checkout
  const orderId = `premium_${user?.id?.substring(0, 8) ?? 'anon'}_${Date.now()}`;

  // Fetch tag IDs for this article (for cross-displaying tag comments)
  const { data: articleTagLinks } = await supabase
    .from('article_tags')
    .select('tag_id')
    .eq('article_id', article.id);
  const articleTagIds = articleTagLinks?.map(t => t.tag_id) ?? [];

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
          {article.published_at && (
            <span className="text-sm text-slate-400">
              {new Date(article.published_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">{article.title}</h1>
        {/* Tags */}
        {await (async () => {
          const { data: tagLinks } = await supabase
            .from('article_tags')
            .select('tag_id, tags(name, slug)')
            .eq('article_id', article.id);
          if (!tagLinks || tagLinks.length === 0) return null;
          return (
            <div className="flex gap-2 flex-wrap">
              {tagLinks.map((tl: any) => (
                <Link
                  key={tl.tag_id}
                  href={`/tag/${tl.tags?.slug ?? tl.tags?.[0]?.slug}`}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 transition-colors"
                >
                  #{tl.tags?.name ?? tl.tags?.[0]?.name}
                </Link>
              ))}
            </div>
          );
        })()}
      </header>

      {/* AI 5-Line Summary */}
      {article.summary_5lines && (
        <section className="bento-card p-5 sm:p-6 border-brand-primary/50 relative overflow-hidden">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-brand-primary">
            ✨ AI 핵심 요약
          </h2>
          <ul className="space-y-2.5">
            {article.summary_5lines.split('\n').filter((l: string) => l.trim()).map((line: string, idx: number) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-xs font-bold mt-0.5">
                  {idx + 1}
                </span>
              <p className="text-sm sm:text-base leading-relaxed">{decodeEntities(line.replace(/^\d+\.\s*/, ''))}</p>
              </li>
            ))}
          </ul>
        </section>
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

      {/* Comments Section */}
      <CommentSection articleId={article.id} tagIds={articleTagIds} />

      {/* Footer & Original Link */}
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
    </div>
  );
}
