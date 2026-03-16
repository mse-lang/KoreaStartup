import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function GET() {
  const supabase = await createClient()

  // Fetch articles from last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, source_name, summary_5lines, category, created_at')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!articles || articles.length === 0) {
    return NextResponse.json({
      briefing: '오늘 등록된 기사가 아직 없습니다. 잠시 후 다시 확인해주세요.',
      article_count: 0,
      generated_at: new Date().toISOString(),
    })
  }

  const articleSummaries = articles.map((a, i) =>
    `${i + 1}. [${a.source_name}] ${a.title}\n   ${a.summary_5lines?.split('\n')[0]?.replace(/^\d+\.\s*/, '') || '요약 없음'}`
  ).join('\n\n')

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `당신은 한국 스타트업 생태계 전문 뉴스 앵커입니다.
지난 24시간 동안 수집된 아래 기사들을 분석하고, 2분 안에 읽을 수 있는 "오늘의 AI 브리핑"을 작성해주세요.

브리핑 규칙:
1. 한국어(ko-KR)로 작성
2. 전체 5~7개 핵심 포인트로 구성
3. 각 포인트는 1~2문장으로 간결하게
4. 투자 유치, 신규 서비스, 정책 변화 등 중요도 순 정렬
5. 시작은 "☀️ 오늘의 스타트업 브리핑" 이라는 인사말로
6. 마지막에 "💡 오늘의 인사이트:" 로 핵심 트렌드 한 줄 요약 추가
7. 마크다운 형식 사용 (번호 리스트, 볼드)

[오늘의 기사 ${articles.length}건]:
${articleSummaries}`

    const result = await model.generateContent(prompt)
    const briefing = result.response.text()

    return NextResponse.json({
      briefing: briefing.trim(),
      article_count: articles.length,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AI Briefing Error:', error)
    return NextResponse.json({
      briefing: `오늘 ${articles.length}건의 기사가 등록되었습니다. AI 브리핑 생성에 실패했습니다.`,
      article_count: articles.length,
      generated_at: new Date().toISOString(),
    })
  }
}
