import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Increment view count for an article
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Use RPC or direct update to increment view_count
  const { error } = await supabase.rpc('increment_view_count', { article_id: id })

  if (error) {
    // Fallback: manual increment
    const { data: article } = await supabase
      .from('articles')
      .select('view_count')
      .eq('id', id)
      .single()

    const newCount = (article?.view_count || 0) + 1
    await supabase
      .from('articles')
      .update({ view_count: newCount })
      .eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
