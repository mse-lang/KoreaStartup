import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    .replace(/&#\d+;/g, '')
}

// Clean metadata from raw content
function cleanForSummary(text: string): string {
  return decodeEntities(text)
    .replace(/https?:\/\/[^\s]+/g, '')         // remove URLs
    .replace(/\[gray\][\s\S]*?\[\/gray\]/gi, '') // remove [gray] blocks
    .split(/\n/)
    .filter(line => {
      const t = line.trim()
      if (!t) return false
      if (t.startsWith('Title:')) return false
      if (t.startsWith('URL Source:')) return false
      if (t.startsWith('Published Time:')) return false
      if (t.startsWith('Markdown Content:')) return false
      if (t.match(/^!\[/)) return false
      if (t.startsWith('The post ')) return false
      if (t.includes('appeared first on')) return false
      if (t.startsWith('###')) return false
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

// Score and pick top 5 important sentences
function generateSummary(title: string, text: string): string {
  const cleaned = cleanForSummary(text)
  const allSentences = cleaned
    .split(/(?<=[.!?])\s+|(?<=다\.)\s*|(?<=요\.)\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 250)

  const scored = allSentences.map(s => {
    let score = 0
    if (s.match(/[가-힣]+(?:랩|텍|스|넷|봇|왕|러|앱|닷|컴|뱅크|박스|팜)/)) score += 3
    if (s.includes('"') || s.includes('"') || s.includes('「')) score += 2
    if (s.match(/\d+(?:억|만|조|%|개|건|명|원)/)) score += 3
    if (s.match(/투자|선정|출시|발표|확보|달성|매출|성장|개발|운영|설립|협력/)) score += 2
    if (s.match(/[A-Z][a-zA-Z]+/)) score += 1
    const idx = allSentences.indexOf(s)
    score += Math.max(0, 3 - Math.floor(idx / 3))
    return { sentence: s, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const top5 = scored.slice(0, 5)
  top5.sort((a, b) => allSentences.indexOf(a.sentence) - allSentences.indexOf(b.sentence))

  if (top5.length === 0) return `1. ${title}.`

  return top5
    .map((item, i) => {
      let s = item.sentence
      if (!s.match(/[.!?]$/)) s += '.'
      return `${i + 1}. ${s}`
    })
    .join('\n')
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1')
  if (!user && !isLocal) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, content_raw')

  if (!articles) return NextResponse.json({ error: '기사 없음' }, { status: 404 })

  const results = []
  for (const article of articles) {
    const newSummary = generateSummary(article.title, article.content_raw)
    const { error } = await supabase
      .from('articles')
      .update({ summary_5lines: newSummary })
      .eq('id', article.id)

    results.push({
      title: article.title,
      summary: newSummary.split('\n')[0],
      success: !error,
    })
  }

  return NextResponse.json({
    message: `${results.filter(r => r.success).length}/${results.length}개 요약 재생성 완료`,
    results,
  })
}
