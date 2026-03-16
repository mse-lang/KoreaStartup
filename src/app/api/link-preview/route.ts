import { NextResponse } from 'next/server'

function decodeHtml(text: string | null): string | null {
  if (!text) return null
  return text
    .replace(/&quot;/g, '"').replace(/&#034;/g, '"')
    .replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8216;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, m => {
      const code = parseInt(m.replace(/&#|;/g, ''))
      return isNaN(code) ? m : String.fromCharCode(code)
    })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) return NextResponse.json({ error: 'url 필요' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()

    const getMetaContent = (property: string): string | null => {
      const regex = new RegExp(
        `<meta\\s+(?:property|name)=["']${property}["']\\s+content=["']([^"']+)["']` +
        `|<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${property}["']`,
        'i'
      )
      const match = html.match(regex)
      return match?.[1] || match?.[2] || null
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

    const preview = {
      url,
      title: decodeHtml(getMetaContent('og:title') || getMetaContent('twitter:title') || titleMatch?.[1]?.trim() || null),
      description: decodeHtml(getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description') || null),
      image: getMetaContent('og:image') || getMetaContent('twitter:image') || null,
      siteName: decodeHtml(getMetaContent('og:site_name') || null),
      type: getMetaContent('og:type') || null,
    }

    // Detect embeddable content
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
      if (videoId) {
        return NextResponse.json({ ...preview, embedType: 'youtube', embedId: videoId })
      }
    }

    if (url.includes('twitter.com') || url.includes('x.com')) {
      return NextResponse.json({ ...preview, embedType: 'twitter' })
    }

    if (url.includes('instagram.com')) {
      return NextResponse.json({ ...preview, embedType: 'instagram' })
    }

    return NextResponse.json({ ...preview, embedType: 'link' })
  } catch {
    return NextResponse.json({ url, title: url, embedType: 'link' })
  }
}
