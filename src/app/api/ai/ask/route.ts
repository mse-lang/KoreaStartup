import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  const { article_id, question } = await request.json()

  if (!article_id || !question) {
    return NextResponse.json({ error: '기사 ID와 질문이 필요합니다' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch article content
  const { data: article } = await supabase
    .from('articles')
    .select('title, content_raw, summary_5lines, source_name')
    .eq('id', article_id)
    .single()

  if (!article) {
    return NextResponse.json({ error: '기사를 찾을 수 없습니다' }, { status: 404 })
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `당신은 한국 스타트업 뉴스 전문 AI 어시스턴트입니다. 
아래 기사를 읽고 사용자의 질문에 한국어(ko-KR)로 친절하고 정확하게 답변하세요.

답변 규칙:
1. 반드시 기사 내용에 근거하여 답변할 것
2. 기사에 없는 내용은 "기사에 해당 정보가 없습니다"라고 명시할 것
3. 답변은 2~4문장으로 간결하게
4. 전문 용어는 쉽게 풀어서 설명
5. 투자 금액, 기업명, 기술명 등 고유명사는 정확하게

[기사 제목]: ${article.title}
[출처]: ${article.source_name}
[AI 요약]: ${article.summary_5lines || '없음'}
[기사 본문]:
${(article.content_raw || '').substring(0, 6000)}

[사용자 질문]: ${question}`

    const result = await model.generateContent(prompt)
    const answer = result.response.text()

    return NextResponse.json({ answer: answer.trim() })
  } catch (error) {
    console.error('AI Q&A Error:', error)
    return NextResponse.json({ error: 'AI 응답 생성에 실패했습니다' }, { status: 500 })
  }
}
