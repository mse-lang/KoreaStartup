import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { COMMUNITY_TAGS } from '@/lib/tag-rules'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  // Clean up the old used-market tag
  await supabase.from('tags').delete().eq('slug', 'used-market');

  const results = []
  for (const ct of COMMUNITY_TAGS) {
    const { data, error } = await supabase
      .from('tags')
      .upsert({
        name: `${ct.emoji} ${ct.tag}`,
        slug: ct.slug,
        description: ct.description,
        article_count: 0,
      }, { onConflict: 'slug' })
      .select('id')
      .single()

    results.push({ tag: ct.tag, slug: ct.slug, success: !!data, error: error?.message })
  }

  return NextResponse.json({ message: '커뮤니티 태그 갱신 완료 (오리지널 태그 추가, 중고거래 삭제)', results })
}
