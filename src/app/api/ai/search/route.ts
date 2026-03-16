import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  const { query } = await request.json()

  if (!query || query.length < 2) {
    return NextResponse.json({ error: '검색어를 입력해주세요' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch recent articles for AI to search through
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, source_name, summary_5lines, og_image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!articles || articles.length === 0) {
    return NextResponse.json({ results: [], ai_summary: '검색 가능한 기사가 없습니다.' })
  }

  // Build article index for AI
  const articleIndex = articles.map((a, i) => 
    `[${i}] "${a.title}" (${a.source_name}) — ${a.summary_5lines?.split('\n')[0]?.replace(/^\d+\.\s*/, '') || ''}`
  ).join('\n')

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `당신은 한국 스타트업 뉴스 검색 AI입니다.
사용자의 검색 의도를 파악하고, 아래 기사 목록에서 가장 관련 있는 기사를 찾아주세요.

검색 규칙:
1. 반드시 JSON 형식으로만 응답할 것
2. "matched_indices"에 관련 기사의 인덱스 번호 배열 (최대 8개, 관련도 높은 순)
3. "search_summary"에 검색 결과를 1~2문장으로 요약
4. 의미적으로 유사한 기사도 포함 (키워드 + 의미 기반)

[기사 목록]:
${articleIndex}

[검색어]: ${query}

응답 형식 (JSON only):
{"matched_indices": [0, 3, 7], "search_summary": "검색 결과 요약..."}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Parse AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Fallback: basic text search
      const filtered = articles.filter(a => 
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        (a.summary_5lines || '').toLowerCase().includes(query.toLowerCase())
      )
      return NextResponse.json({
        results: filtered.slice(0, 8),
        ai_summary: `"${query}" 키워드가 포함된 기사 ${filtered.length}건을 찾았습니다.`,
      })
    }

    const parsed = JSON.parse(jsonMatch[0])
    const matchedArticles = (parsed.matched_indices || [])
      .filter((i: number) => i >= 0 && i < articles.length)
      .map((i: number) => articles[i])

    return NextResponse.json({
      results: matchedArticles,
      ai_summary: parsed.search_summary || `"${query}" 관련 기사 ${matchedArticles.length}건`,
    })
  } catch (error) {
    console.error('AI Search Error:', error)
    // Fallback to basic text search
    const filtered = articles.filter(a =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      (a.summary_5lines || '').toLowerCase().includes(query.toLowerCase())
    )
    return NextResponse.json({
      results: filtered.slice(0, 8),
      ai_summary: `"${query}" 키워드 검색 결과 ${filtered.length}건`,
    })
  }
}
