import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = 12

  if (!q) return NextResponse.json({ articles: [], total: 0 })

  const supabase = await createClient()

  // Search in title and content_raw using ilike
  const { data, count } = await supabase
    .from('articles')
    .select('id, title, source_name, summary_5lines, og_image_url, created_at, category', { count: 'exact' })
    .or(`title.ilike.%${q}%,content_raw.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  return NextResponse.json({
    articles: data ?? [],
    total: count ?? 0,
    page,
    perPage,
    totalPages: Math.ceil((count ?? 0) / perPage),
  })
}
