import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkProfanity } from '@/lib/profanity'
import { COMMUNITY_TAGS, TAG_RULES } from '@/lib/tag-rules'

// All known tag names for hashtag detection
const ALL_TAG_NAMES = [
  ...COMMUNITY_TAGS.map(t => t.tag),
  ...TAG_RULES.map(t => t.tag),
]

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { article_id, tag_id, content, parent_id, depth, user_id, anonymous_name, anonymous_ip } = body

    if ((!article_id && !tag_id) || !content?.trim()) {
      return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: '댓글은 2000자까지 입력 가능합니다.' }, { status: 400 })
    }

    // AI profanity check
    const { isProfane, matched } = checkProfanity(content)

    const payload: Record<string, unknown> = {
      content: content.trim(),
      parent_id: parent_id ?? null,
      depth: depth ?? 0,
      user_id: user_id ?? null,
      anonymous_name: anonymous_name ?? null,
      anonymous_ip: anonymous_ip ?? null,
      is_blinded: isProfane,
      blind_reason: isProfane ? `욕설 자동 감지 (${matched.join(', ')})` : null,
    }

    // Set article_id or tag_id (not both)
    if (tag_id) {
      payload.tag_id = tag_id
      payload.article_id = null
    } else {
      payload.article_id = article_id
      payload.tag_id = null
    }

    const { data, error } = await supabase
      .from('comments')
      .insert(payload)
      .select('id, is_blinded')
      .single()

    if (error) {
      console.error('[comments API] Insert failed:', error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // === Community tag auto-linking via hashtags ===
    // If comment is on an article (not a tag board), check for #태그 mentions
    let linkedTags: string[] = []
    if (article_id && !isProfane) {
      // Extract hashtags from comment content (e.g., #창업고민, #CEO토크, #AI)
      const hashtagRegex = /#([^\s#,]+)/g
      const mentions: string[] = []
      let match
      while ((match = hashtagRegex.exec(content)) !== null) {
        mentions.push(match[1])
      }

      if (mentions.length > 0) {
        // Find matching tags in the database
        for (const mention of mentions) {
          // Check if it matches any known tag name
          const matchedTag = ALL_TAG_NAMES.find(
            name => name.toLowerCase() === mention.toLowerCase()
          )
          if (!matchedTag) continue

          // Fetch the tag from DB
          const { data: tagData } = await supabase
            .from('tags')
            .select('id, slug')
            .ilike('name', matchedTag)
            .maybeSingle()

          if (tagData) {
            // Link article to this tag (upsert to avoid duplicates)
            await supabase
              .from('article_tags')
              .upsert(
                { article_id, tag_id: tagData.id },
                { onConflict: 'article_id,tag_id' }
              )
            
            // Update tag article_count
            const { count } = await supabase
              .from('article_tags')
              .select('*', { count: 'exact', head: true })
              .eq('tag_id', tagData.id)
            await supabase
              .from('tags')
              .update({ article_count: count ?? 0 })
              .eq('id', tagData.id)

            linkedTags.push(matchedTag)
          }
        }
      }
    }

    return NextResponse.json({
      id: data.id,
      is_blinded: data.is_blinded,
      linked_tags: linkedTags,
      message: isProfane
        ? '댓글이 등록되었으나, 부적절한 표현이 감지되어 블라인드 처리되었습니다.'
        : linkedTags.length > 0
          ? `댓글이 등록되었습니다. 이 기사가 ${linkedTags.map(t => `#${t}`).join(', ')} 태그에 연결되었습니다.`
          : '댓글이 등록되었습니다.',
    })
  } catch (err) {
    console.error('[comments API] Unexpected error:', err)
    return NextResponse.json({ error: `서버 오류: ${(err as Error).message}` }, { status: 500 })
  }
}
