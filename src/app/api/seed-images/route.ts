import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function extractOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        // Mimic a social media crawler / Facebook bot
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html',
      },
    })
    const html = await res.text()

    // Extract og:image from meta tags
    const ogMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i)

    return ogMatch?.[1] ?? null
  } catch (e) {
    console.error(`Failed to fetch OG image from ${url}:`, e)
    return null
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  // Get all articles
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, source_url, og_image_url')

  if (!articles) return NextResponse.json({ error: 'No articles found' }, { status: 404 })

  const results = []
  for (const article of articles) {
    const ogImage = await extractOgImage(article.source_url)

    if (ogImage) {
      const { error } = await supabase
        .from('articles')
        .update({ og_image_url: ogImage })
        .eq('id', article.id)

      results.push({
        title: article.title,
        og_image: ogImage,
        success: !error,
        error: error?.message ?? null,
      })
    } else {
      results.push({
        title: article.title,
        og_image: null,
        success: false,
        error: 'og:image 메타태그를 찾을 수 없습니다',
      })
    }
  }

  return NextResponse.json({
    message: `${results.filter(r => r.success).length}/${results.length}개 OG 이미지 추출 완료`,
    results,
  })
}
