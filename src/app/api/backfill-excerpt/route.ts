import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: [['media:content', 'media'], ['content:encoded', 'contentEncoded'], ['dc:creator', 'creator']],
  },
})

// Strip HTML tags and decode entities
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1')
  if (!isLocal) {
    return NextResponse.json({ error: 'localhost only' }, { status: 403 })
  }

  // Get all RSS sources
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('is_active', true)

  if (!sources || sources.length === 0) {
    return NextResponse.json({ error: 'No RSS sources found' })
  }

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.feed_url)

      for (const item of feed.items) {
        const url = item.link?.trim()
        if (!url) continue

        // Find matching article in DB
        const { data: article } = await supabase
          .from('articles')
          .select('id, excerpt')
          .eq('source_url', url)
          .maybeSingle()

        if (!article) continue
        if (article.excerpt && article.excerpt.length > 20) {
          skipped++
          continue // already has excerpt
        }

        // Extract RSS description as excerpt
        const rssExcerpt = stripHtml(item.contentSnippet || item.content || '').substring(0, 500)

        if (rssExcerpt && rssExcerpt.length > 20) {
          await supabase
            .from('articles')
            .update({ excerpt: rssExcerpt })
            .eq('id', article.id)
          updated++
        }
      }
    } catch (e) {
      errors.push(`${source.source_name}: ${(e as Error).message}`)
    }
  }

  return NextResponse.json({
    message: `Backfill complete: ${updated} articles updated, ${skipped} already had excerpt`,
    updated,
    skipped,
    errors,
  })
}
