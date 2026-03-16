import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { COMMUNITY_TAGS } from '@/lib/tag-rules'

const COMMUNITY_SLUGS = new Set(COMMUNITY_TAGS.map(t => t.slug))

export async function GET() {
  const supabase = await createClient()

  // Fetch all non-community tags
  const { data: tags } = await supabase
    .from('tags')
    .select('name, slug')

  if (!tags) return NextResponse.json({ tags: [] })

  const regularTags = tags.filter(t => !COMMUNITY_SLUGS.has(t.slug))

  // Shuffle (Fisher-Yates)
  for (let i = regularTags.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[regularTags[i], regularTags[j]] = [regularTags[j], regularTags[i]]
  }

  return NextResponse.json({ tags: regularTags.slice(0, 15) })
}
