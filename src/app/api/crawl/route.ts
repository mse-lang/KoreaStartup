import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { GoogleGenerativeAI } from '@google/generative-ai'

const parser = new Parser({
  customFields: {
    item: [['media:content', 'media'], ['content:encoded', 'contentEncoded'], ['dc:creator', 'creator']],
  },
})

// Initialize Gemini API
const aiConfig = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const aiModel = aiConfig.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

// Category RSS feeds — multi-source
const CATEGORIES = [
  // VentureSquare (최우선)
  { name: 'special-post',  feed: 'https://www.venturesquare.net/category/special-post/feed/',   label: '스페셜포스트', source: '벤처스퀘어', maxArticles: 4 },
  { name: 'interview-news',feed: 'https://www.venturesquare.net/category/interview-news/feed/', label: '인터뷰',       source: '벤처스퀘어', maxArticles: 3 },
  { name: 'startup-topic',  feed: 'https://www.venturesquare.net/startup-topic/feed/',           label: '스타트업토픽', source: '벤처스퀘어', maxArticles: 3 },
  // 한국경제 IT/과학
  { name: 'hankyung-it',    feed: 'https://rss.hankyung.com/new/news_it.xml',                    label: '한국경제IT',   source: '한국경제',   maxArticles: 5 },
  // 매일경제 IT/과학
  { name: 'mk-it',          feed: 'https://www.mk.co.kr/rss/50300009/',                          label: '매경IT',       source: '매일경제',   maxArticles: 5 },
  // 전자신문 미래/벤처
  { name: 'etnews-startup', feed: 'https://rss.etnews.com/Section901.xml',                       label: '전자신문벤처', source: '전자신문',   maxArticles: 5 },
  // 파이낸셜뉴스 IT
  { name: 'fnnews-it',      feed: 'https://www.fnnews.com/rss/new/fn_realnews_it.xml',           label: '파이낸셜IT',   source: '파이낸셜뉴스', maxArticles: 5 },
  // 조선비즈 IT/과학 (대표 RSS 우선 적용)
  { name: 'chosunbiz-it',   feed: 'https://biz.chosun.com/site/data/rss/it.xml',                 label: '조선비즈IT',   source: '조선비즈',   maxArticles: 5 },
  // EO (스타트업 콘텐츠)
  { name: 'eo-planet',      feed: 'https://eopla.net/feed',                                      label: 'EO플래닛',     source: 'EO',         maxArticles: 5 },
  // IT동아
  { name: 'itdonga',         feed: 'https://it.donga.com/feeds/rss/',                              label: 'IT동아',       source: 'IT동아',     maxArticles: 3 },
  // ZDNet Korea
  { name: 'zdnet-korea',     feed: 'http://feeds.feedburner.com/zdkorea',                          label: 'ZDNet',        source: 'ZDNet Korea', maxArticles: 3 },
  // GeekNews
  { name: 'geeknews',        feed: 'https://news.hada.io/rss/news',                               label: '긱뉴스',       source: 'GeekNews',   maxArticles: 3 },
  // 블로터
  { name: 'bloter',          feed: 'http://feeds.feedburner.com/Bloter',                           label: '블로터',       source: '블로터',     maxArticles: 3 },
]

import { TAG_RULES } from '@/lib/tag-rules'

// Strip HTML tags and decode entities
function stripHtml(html: string): string {
  return html
    // Convert line breaks and block elements to newlines BEFORE stripping tags
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    // Now strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode basic entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Squeeze multiple spaces (but not newlines)
    .replace(/[ \t]+/g, ' ')
    // Clean up excessive newlines
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

// Extract first image from HTML content or media:content
function extractImage(item: any): string | null {
  // Try media:content first
  if (item.media?.['$']?.url) return item.media['$'].url

  // Try to find <img> in content
  const content = item.contentEncoded || item.content || ''
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
  return imgMatch?.[1] ?? null
}

// Clean text: strip metadata lines injected by Jina Reader / RSS, decode entities
function cleanForSummary(text: string): string {
  return text
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8216;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#038;/g, '&').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')            // remaining numeric entities
    .replace(/https?:\/\/[^\s]+/g, '') // remove URLs
    .replace(/\[gray\][\s\S]*?\[\/gray\]/gi, '') // remove [gray] blocks
    .split(/\n/)
    .filter(line => {
      const t = line.trim()
      if (!t) return false
      if (t.startsWith('Title:')) return false
      if (t.startsWith('URL Source:')) return false
      if (t.startsWith('Published Time:')) return false
      if (t.startsWith('Markdown Content:')) return false
      if (t.match(/^!\[/)) return false  // markdown images
      if (t.startsWith('The post ')) return false  // WP boilerplate
      if (t.includes('appeared first on')) return false
      if (t.startsWith('###')) return false   // markdown headings
      if (t.includes('editor@venturesquare.net')) return false
      if (t.length < 10) return false
      // Skip PURELY English lines (no Korean at all, 95%+ ASCII)
      const stripped = t.replace(/[\s\d.,!?*\-:;'"()\[\]{}@#$%^&+=<>/\\|~`]/g, '')
      if (stripped.length > 30 && !/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(stripped)) {
        const asciiRatio = stripped.replace(/[^a-zA-Z]/g, '').length / stripped.length
        if (asciiRatio > 0.95) return false
      }
      return true
    })
    .join(' ')
}

// Fetch clean markdown from Jina Reader
async function fetchJinaReaderMarkdown(url: string): Promise<string> {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        // Instruct Jina to strictly extract the core readable content
        'X-Retain-Images': 'none',
        'X-Target-Selector': 'article, .article, .news-article, .news_body, #articleBody, #dic_area',
      },
      // Set timeout
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return '';
    return await response.text();
  } catch (error) {
    console.error('Jina Reader Error:', error);
    return '';
  }
}

// Generate summary using Gemini AI, with RSS description as fallback
async function generateSummaryWithAI(title: string, markdownText: string, rssDescription?: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      // No API key — use RSS description if available
      if (rssDescription && rssDescription.trim().length > 20) {
        return rssDescription.trim();
      }
      return `1. ${title}`;
    }

    const prompt = `
당신은 스타트업 전문 뉴스 큐레이터입니다. 다음 기사 제목과 본문 내용을 읽고, 창업자 및 투자자에게 가장 유용하고 핵심적인 정보 5가지를 추출하여 한국여(ko-KR)로 요약해주세요.

요약 조건:
1. 반드시 5개의 번호 매기기 리스트 형식으로 출력할 것. (예: 1. ~ 2. ~)
2. 각 줄은 1~2문장 내외로 간결하게 명사형이나 '-음', '-함', '-다' 로 끝낼 것.
3. 투자 유치 금액, 기업 가치, 신규 출시 서비스 이름, 핵심 기술, 정부 지원금 등 구체적인 고유명사와 숫자를 최대한 포함할 것.
4. 해외 기사라도 반드시 한국어(ko-KR)로 번역하여 요약할 것.
5. 다른 불필요한 인사말이나 서론/결론은 제외하고 오직 5줄의 요약 텍스트만 출력할 것.

[제목]: ${title}
[본문]:
${markdownText.substring(0, 8000)} // 생략 방지
    `;

    const result = await aiModel.generateContent(prompt);
    const text = result.response.text();
    
    // Ensure it outputs something meaningful
    if (text && text.trim().length > 10) {
      return text.trim();
    }
  } catch (error) {
    console.error('Gemini Summary Error:', error);
  }
  // Fallback: use RSS description if available, otherwise just the title
  if (rssDescription && rssDescription.trim().length > 20) {
    return rssDescription.trim();
  }
  return `1. ${title}`;
}

// Extract tags from text
function extractTags(text: string): { tag: string; slug: string; description: string }[] {
  const lower = text.toLowerCase()
  return TAG_RULES.filter(rule =>
    rule.keywords.some(kw => lower.includes(kw.toLowerCase()))
  ).map(r => ({ tag: r.tag, slug: r.slug, description: r.description }))
}

// Generate SEO-friendly URL slug from Korean/English title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, '') // keep alphanumeric, Korean, spaces, hyphens
    .replace(/\s+/g, '-')   // spaces to hyphens
    .replace(/-+/g, '-')     // collapse multiple hyphens
    .replace(/^-|-$/g, '')   // trim leading/trailing hyphens
    .substring(0, 120)       // max 120 chars
}

// Optimize heading hierarchy in markdown content
function optimizeHeadings(markdown: string): string {
  // Ensure no H1 in body (article title is already H1)
  // Convert H1 -> H2, H2 -> H3 within body
  return markdown
    .replace(/^# (?!#)/gm, '## ')   // H1 -> H2
    .replace(/^## (?!#)/gm, '### ') // H2 -> H3
}

// Append compliance attribution footer
function addComplianceFooter(content: string, sourceName: string, sourceUrl: string): string {
  const footer = `\n\n---\n> 📰 이 기사의 원문은 [${sourceName}](${sourceUrl})에서 확인할 수 있습니다.`
  // Don't add if already has attribution
  if (content.includes('이 기사의 원문은')) return content
  return content + footer
}

// Source priority — lower number = higher priority
const SOURCE_PRIORITY: Record<string, number> = {
  '벤처스퀘어': 1,
  'EO': 2,
  '전자신문': 3,
  '한국경제': 4,
  '매일경제': 5,
  '파이낸셜뉴스': 6,
  '조선비즈': 7,
  '플래텀': 8,
  'IT동아': 9,
  'ZDNet Korea': 10,
  'GeekNews': 11,
  '블로터': 12,
}

// Normalize title for fuzzy comparison
function normalizeTitle(title: string): string {
  return title
    .replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣]/g, '')  // keep only word chars + Korean
    .toLowerCase()
}

// Check title similarity (Jaccard on character bigrams)
function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (na.length < 4 || nb.length < 4) return 0

  const bigramsA = new Set<string>()
  for (let i = 0; i < na.length - 1; i++) bigramsA.add(na.substring(i, i + 2))
  const bigramsB = new Set<string>()
  for (let i = 0; i < nb.length - 1; i++) bigramsB.add(nb.substring(i, i + 2))

  let intersection = 0
  for (const bg of bigramsA) { if (bigramsB.has(bg)) intersection++ }
  const union = bigramsA.size + bigramsB.size - intersection
  return union === 0 ? 0 : intersection / union
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Allow cron calls with secret key OR authenticated admin OR localhost
  const { searchParams } = new URL(request.url)
  const cronKey = searchParams.get('key')
  const validCron = cronKey === process.env.CRON_SECRET
  const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1')

  if (!user && !validCron && !isLocal) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }


  // Fetch active sources from DB
  const { data: dbSources } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('is_active', true)
    .order('source_name')

  // Use DB sources, fall back to hardcoded CATEGORIES
  const activeSources = (dbSources && dbSources.length > 0)
    ? dbSources.map(s => ({
        name: s.name, feed: s.feed_url, label: s.label,
        source: s.source_name, maxArticles: s.max_articles,
      }))
    : CATEGORIES

  // Pre-fetch recent article titles for fuzzy dedup (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: recentArticles } = await supabase
    .from('articles')
    .select('id, title, source_name, source_url')
    .gte('created_at', weekAgo)

  const existingTitles = (recentArticles || []).map(a => ({
    id: a.id, title: a.title, source: a.source_name, url: a.source_url,
  }))

  const results: { title: string; category: string; status: string }[] = []
  const sourceComposition: Record<string, number> = {}

  for (const category of activeSources) {
    try {
      const feed = await parser.parseURL(category.feed)
      const items = feed.items.slice(0, category.maxArticles)

      for (const item of items) {
        const title = item.title?.trim()
        const url = item.link?.trim()

        if (!title || !url) continue

        // 1. Exact URL dedup
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('source_url', url)
          .maybeSingle()

        if (existing) {
          results.push({ title, category: category.label, status: '⏭️ URL 중복 스킵' })
          sourceComposition[category.source] = (sourceComposition[category.source] || 0)
          continue
        }

        // 2. Title similarity dedup — check against recent articles
        const currentPriority = SOURCE_PRIORITY[category.source] ?? 99
        let isDuplicate = false

        for (const ea of existingTitles) {
          const sim = titleSimilarity(title, ea.title)
          if (sim > 0.6) {
            // Same story found — check source priority
            const existingPriority = SOURCE_PRIORITY[ea.source] ?? 99
            if (existingPriority <= currentPriority) {
              // Existing article is from a higher or equal priority source — skip new one
              results.push({ title, category: category.label, status: `⏭️ 유사 기사 존재 (${ea.source}, 유사도 ${(sim * 100).toFixed(0)}%)` })
              isDuplicate = true
              break
            } else {
              // New article is from a higher-priority source — replace existing
              // Keep existing but still insert the new one, mark the swap
              results.push({ title, category: category.label, status: `🔄 우선 출처로 대체 등록 (기존: ${ea.source}, 유사도 ${(sim * 100).toFixed(0)}%)` })
              // Don't break — let it proceed to insert
            }
          }
        }

        if (isDuplicate) continue

        // Try Jina Reader first for markdown, fallback to RSS content
        let contentRaw = await fetchJinaReaderMarkdown(url)
        if (!contentRaw || contentRaw.length < 100) {
          const htmlContent = item.contentEncoded || item.content || item.contentSnippet || ''
          contentRaw = stripHtml(htmlContent).substring(0, 4000)
        }

        // Optimize headings & add compliance footer
        contentRaw = optimizeHeadings(contentRaw)
        contentRaw = addComplianceFooter(contentRaw, category.source, url)

        const ogImage = extractImage(item)
        // Use RSS description as fallback for summary
        const rssDescription = stripHtml(item.contentSnippet || item.content || '').substring(0, 500)
        const summary = await generateSummaryWithAI(title, contentRaw, rssDescription)
        const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
        const slug = generateSlug(title)
        const authorName = (item.creator || (item as any).author || '').trim() || null

        // Insert article
        const { data: inserted, error: insertError } = await supabase
          .from('articles')
          .insert({
            title,
            slug,
            source_name: category.source,
            source_url: url,
            content_raw: contentRaw,
            summary_5lines: summary,
            og_image_url: ogImage,
            category: category.name,
            published_at: pubDate,
            author_id: user?.id ?? null,
            author_name: authorName,
          })
          .select('id')
          .single()

        if (insertError) {
          results.push({ title, category: category.label, status: `❌ ${insertError.message}` })
          continue
        }

        // Auto-tag
        if (inserted) {
          const tags = extractTags(title + ' ' + contentRaw.substring(0, 2000))
          for (const { tag, slug, description } of tags) {
            const { data: tagData } = await supabase
              .from('tags')
              .upsert({ name: tag, slug, description }, { onConflict: 'slug' })
              .select('id')
              .single()
            if (tagData) {
              await supabase
                .from('article_tags')
                .upsert({ article_id: inserted.id, tag_id: tagData.id }, { onConflict: 'article_id,tag_id' })
            }
          }

          // Track for title dedup within this batch
          existingTitles.push({ id: inserted.id, title, source: category.source, url })
        }

        sourceComposition[category.source] = (sourceComposition[category.source] || 0) + 1
        results.push({ title, category: category.label, status: '✅ 등록 완료' })
      }
    } catch (e) {
      results.push({ title: category.label, category: category.label, status: `❌ RSS 피드 오류: ${(e as Error).message}` })
    }
  }

  // Update tag counts
  const { data: allTags } = await supabase.from('tags').select('id')
  if (allTags) {
    for (const t of allTags) {
      const { count } = await supabase.from('article_tags').select('*', { count: 'exact', head: true }).eq('tag_id', t.id)
      await supabase.from('tags').update({ article_count: count ?? 0 }).eq('id', t.id)
    }
  }

  const newCount = results.filter(r => r.status.startsWith('✅')).length
  const skipCount = results.filter(r => r.status.startsWith('⏭️')).length
  const swapCount = results.filter(r => r.status.startsWith('🔄')).length

  return NextResponse.json({
    message: `${newCount}개 신규 등록 / ${skipCount}개 중복 스킵 / ${swapCount}개 우선 출처 대체`,
    crawled_at: new Date().toISOString(),
    source_composition: sourceComposition,
    results,
  })
}

