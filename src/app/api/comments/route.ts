import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkProfanity } from '@/lib/profanity'

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

    return NextResponse.json({
      id: data.id,
      is_blinded: data.is_blinded,
      message: isProfane
        ? '댓글이 등록되었으나, 부적절한 표현이 감지되어 블라인드 처리되었습니다.'
        : '댓글이 등록되었습니다.',
    })
  } catch (err) {
    console.error('[comments API] Unexpected error:', err)
    return NextResponse.json({ error: `서버 오류: ${(err as Error).message}` }, { status: 500 })
  }
}
