import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { TAG_RULES } from '@/lib/tag-rules'

function extractTags(text: string) {
  const lower = text.toLowerCase()
  return TAG_RULES.filter(rule =>
    rule.keywords.some(kw => lower.includes(kw.toLowerCase()))
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, content_raw')

  if (!articles) return NextResponse.json({ error: '기사 없음' }, { status: 404 })

  let totalTags = 0
  for (const article of articles) {
    const tags = extractTags(article.title + ' ' + article.content_raw)
    for (const { tag, slug, description } of tags) {
      const { data: tagData } = await supabase
        .from('tags')
        .upsert({ name: tag, slug, description }, { onConflict: 'slug' })
        .select('id')
        .single()
      if (tagData) {
        await supabase
          .from('article_tags')
          .upsert({ article_id: article.id, tag_id: tagData.id }, { onConflict: 'article_id,tag_id' })
        totalTags++
      }
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

  return NextResponse.json({
    message: `${articles.length}개 기사에 총 ${totalTags}개 태그 적용 완료`,
  })
}
