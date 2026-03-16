import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Keyword-to-tag mapping for auto-tagging
const TAG_RULES: { keywords: string[]; tag: string; slug: string }[] = [
  { keywords: ['AI', '인공지능', 'LLM', '생성형', 'GPT', '클로드', 'Gemini', '머신러닝', '딥러닝'], tag: 'AI', slug: 'ai' },
  { keywords: ['로봇', '로보틱스', '휴머노이드', 'Physical AI'], tag: '로보틱스', slug: 'robotics' },
  { keywords: ['투자', '시리즈', 'Seed', 'Pre-A', 'Series', '펀딩', 'VC', '액셀러레이터', '배치'], tag: '투자', slug: 'investment' },
  { keywords: ['스타트업', '창업', '창업자', '대표'], tag: '스타트업', slug: 'startup' },
  { keywords: ['글로벌', '해외', '실리콘밸리', 'Y Combinator', 'YC', '유럽', '미국'], tag: '글로벌', slug: 'global' },
  { keywords: ['모빌리티', '택시', '자율주행', '카카오모빌리티'], tag: '모빌리티', slug: 'mobility' },
  { keywords: ['부동산', '프롭테크', '임대', '공실', '건물', '매입'], tag: '프롭테크', slug: 'proptech' },
  { keywords: ['핀테크', '결제', '토스', '페이먼츠', '금융'], tag: '핀테크', slug: 'fintech' },
  { keywords: ['SaaS', '플랫폼', '구독', 'B2B'], tag: 'SaaS', slug: 'saas' },
  { keywords: ['헬스케어', '바이오', '의료', '건강'], tag: '헬스케어', slug: 'healthcare' },
  { keywords: ['검색', '지식', '교육', '에듀테크', '연구'], tag: '지식·교육', slug: 'knowledge' },
  { keywords: ['클론', '메신저', '챗봇', '대화'], tag: '대화형AI', slug: 'conversational-ai' },
]

function extractTags(title: string, content: string): { tag: string; slug: string }[] {
  const text = (title + ' ' + content).toLowerCase()
  const matched = TAG_RULES.filter(rule =>
    rule.keywords.some(kw => text.includes(kw.toLowerCase()))
  )
  return matched.map(r => ({ tag: r.tag, slug: r.slug }))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  // Get all articles
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, content_raw')

  if (!articles) return NextResponse.json({ error: '기사 없음' }, { status: 404 })

  const results = []

  for (const article of articles) {
    const tags = extractTags(article.title, article.content_raw)

    for (const { tag, slug } of tags) {
      // Upsert the tag
      const { data: tagData } = await supabase
        .from('tags')
        .upsert({ name: tag, slug }, { onConflict: 'slug' })
        .select('id')
        .single()

      if (tagData) {
        // Link article to tag (ignore duplicates)
        await supabase
          .from('article_tags')
          .upsert({ article_id: article.id, tag_id: tagData.id }, { onConflict: 'article_id,tag_id' })
      }

      results.push({ article: article.title, tag, success: !!tagData })
    }
  }

  // Update article counts
  const { data: allTags } = await supabase.from('tags').select('id, slug')
  if (allTags) {
    for (const t of allTags) {
      const { count } = await supabase
        .from('article_tags')
        .select('*', { count: 'exact', head: true })
        .eq('tag_id', t.id)
      await supabase.from('tags').update({ article_count: count ?? 0 }).eq('id', t.id)
    }
  }

  return NextResponse.json({
    message: `${results.length}개 태그 매핑 완료`,
    results,
  })
}
