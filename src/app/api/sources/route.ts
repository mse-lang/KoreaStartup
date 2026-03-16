import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: list all sources
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rss_sources')
    .select('*')
    .order('source_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sources: data })
}

// POST: create new source
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { name, feed_url, label, source_name, max_articles, is_active } = body
  if (!feed_url?.trim() || !source_name?.trim()) {
    return NextResponse.json({ error: 'feed_url과 source_name은 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('rss_sources')
    .insert({
      name: name || feed_url.split('/').filter(Boolean).pop(),
      feed_url: feed_url.trim(),
      label: label || source_name,
      source_name: source_name.trim(),
      max_articles: max_articles ?? 5,
      is_active: is_active ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT: update source
export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const { data, error } = await supabase
    .from('rss_sources')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: remove source
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const { error } = await supabase.from('rss_sources').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
