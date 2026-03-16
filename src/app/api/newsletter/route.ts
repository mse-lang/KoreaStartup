import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: '유효한 이메일 주소를 입력해주세요' }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: '이미 구독 중입니다! 📧' })
  }

  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email: email.toLowerCase().trim() })

  if (error) {
    return NextResponse.json({ error: '구독 처리 중 오류가 발생했습니다' }, { status: 500 })
  }

  return NextResponse.json({ message: '구독 완료! 매일 아침 AI 큐레이션 뉴스를 보내드립니다 🎉' })
}
