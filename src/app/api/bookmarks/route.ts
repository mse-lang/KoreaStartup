import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Toggle bookmark for article
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const { article_id } = await request.json()
  if (!article_id) {
    return NextResponse.json({ error: 'article_id가 필요합니다' }, { status: 400 })
  }

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('article_id', article_id)
    .maybeSingle()

  if (existing) {
    // Remove bookmark
    await supabase.from('bookmarks').delete().eq('id', existing.id)
    return NextResponse.json({ bookmarked: false })
  } else {
    // Add bookmark
    await supabase.from('bookmarks').insert({ user_id: user.id, article_id })
    return NextResponse.json({ bookmarked: true })
  }
}

// GET: Get user's bookmarked articles
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('article_id, created_at, articles(id, title, source_name, summary_5lines, og_image_url, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ bookmarks: bookmarks || [] })
}
