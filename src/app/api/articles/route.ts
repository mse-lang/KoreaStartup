import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TAG_RULES } from '@/lib/tag-rules'
import { GoogleGenerativeAI } from '@google/generative-ai'

function extractTags(text: string): { tag: string; slug: string; description: string }[] {
  const lower = text.toLowerCase()
  return TAG_RULES.filter((rule) =>
    rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))
  ).map((r) => ({ tag: r.tag, slug: r.slug, description: r.description }))
}

const aiConfig = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const aiModel = aiConfig.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, content_raw, is_premium, price, author_id, summary_5lines, free_until } = body

    if (!title || !content_raw) {
      return NextResponse.json({ error: '제목과 본문은 필수입니다.' }, { status: 400 })
    }

    // Verify ownership
    if (author_id !== user.id) {
      return NextResponse.json({ error: '잘못된 작성자 ID입니다.' }, { status: 403 })
    }

    // Verify if trying to create premium article
    if (is_premium) {
      const { data: profile } = await supabase
        .from('author_profiles')
        .select('is_verified')
        .eq('id', user.id)
        .single()

      if (!profile?.is_verified) {
        return NextResponse.json({ error: '유료 기사는 호스트 본인인증 후 작성 가능합니다.' }, { status: 403 })
      }
    }

    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert({
        title,
        content_raw,
        summary_5lines,
        is_premium: is_premium || false,
        price: is_premium ? (price || 0) : 0,
        free_until: free_until || null,
        author_id: user.id,
        source_name: '사용자 제보/작성',
        category: 'user-generated',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error(insertError)
      return NextResponse.json({ error: '기사 등록에 실패했습니다.', details: insertError.message }, { status: 500 })
    }

    // Auto tag
    const tags = extractTags(title + ' ' + content_raw.substring(0, 2000))
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
      }
    }

    return NextResponse.json({ success: true, id: article.id })

  } catch (err: any) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.', details: err.message }, { status: 500 })
  }
}
