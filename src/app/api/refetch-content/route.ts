import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const aiConfig = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const aiModel = aiConfig.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

// Fetch clean markdown from Jina Reader
async function fetchJinaReaderMarkdown(url: string): Promise<string> {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Retain-Images': 'none',
        'X-Target-Selector': 'article, .article, .news-article, .news_body, #articleBody, #dic_area',
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return '';
    return await response.text();
  } catch (error) {
    console.error('Jina Reader Error:', error);
    return '';
  }
}

// Generate summary using Gemini AI
async function generateSummaryWithAI(title: string, markdownText: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) return `1. ${title}`;

    const prompt = `
당신은 스타트업 전문 뉴스 큐레이터입니다. 다음 기사 제목과 본문 내용을 읽고, 창업자 및 투자자에게 가장 유용하고 핵심적인 정보 5가지를 추출하여 한국어(ko-KR)로 요약해주세요.

요약 조건:
1. 반드시 5개의 번호 매기기 리스트 형식으로 출력할 것. (예: 1. ~ 2. ~)
2. 각 줄은 1~2문장 내외로 간결하게 명사형이나 '-음', '-함', '-다' 로 끝낼 것.
3. 투자 유치 금액, 기업 가치, 신규 출시 서비스 이름, 핵심 기술, 정부 지원금 등 구체적인 고유명사와 숫자를 최대한 포함할 것.
4. 해외 기사라도 반드시 한국어(ko-KR)로 번역하여 요약할 것.
5. 다른 불필요한 인사말이나 서론/결론은 제외하고 오직 5줄의 요약 텍스트만 출력할 것.

[제목]: ${title}
[본문]:
${markdownText.substring(0, 8000)}
    `;

    const result = await aiModel.generateContent(prompt);
    const text = result.response.text();
    if (text && text.trim().length > 10) return text.trim();
  } catch (error) {
    console.error('Gemini Summary Error:', error);
  }
  return `1. ${title}`;
}

export async function GET() {
  const supabase = await createClient()

  // Find articles with empty, null, or very short content_raw (< 500 chars = likely just RSS snippet)
  const { data: allArticles, error } = await supabase
    .from('articles')
    .select('id, title, source_url, source_name, content_raw, summary_5lines')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter to articles with short or missing content
  const needsRefetch = (allArticles || []).filter((a: any) => {
    const len = a.content_raw ? a.content_raw.length : 0;
    return len < 500;
  });

  if (needsRefetch.length === 0) {
    return NextResponse.json({ message: '본문이 부족한 기사가 없습니다.', updated: 0 })
  }

  return await processArticles(supabase, needsRefetch.slice(0, 5))
}

async function processArticles(supabase: any, articles: any[]) {
  const results: { title: string; status: string }[] = []

  for (const article of articles) {
    if (!article.source_url) {
      results.push({ title: article.title, status: '⏭️ source_url 없음' })
      continue
    }

    try {
      // Fetch content via Jina Reader
      const contentRaw = await fetchJinaReaderMarkdown(article.source_url)

      if (!contentRaw || contentRaw.length < 50) {
        results.push({ title: article.title, status: '❌ Jina Reader에서 본문을 가져오지 못함' })
        continue
      }

      // Also regenerate summary if it's just the title
      let summary = article.summary_5lines
      const needsSummary = !summary || summary === `1. ${article.title}` || summary.split('\n').length < 2
      if (needsSummary) {
        summary = await generateSummaryWithAI(article.title, contentRaw)
      }

      // Update the article
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          content_raw: contentRaw,
          ...(needsSummary ? { summary_5lines: summary } : {}),
        })
        .eq('id', article.id)

      if (updateError) {
        results.push({ title: article.title, status: `❌ DB 업데이트 오류: ${updateError.message}` })
      } else {
        results.push({ title: article.title, status: `✅ 본문 갱신 완료 (${contentRaw.length}자)${needsSummary ? ' + AI 요약 재생성' : ''}` })
      }
    } catch (e) {
      results.push({ title: article.title, status: `❌ 오류: ${(e as Error).message}` })
    }
  }

  const successCount = results.filter(r => r.status.startsWith('✅')).length

  return NextResponse.json({
    message: `${successCount}개 기사 본문 갱신 완료`,
    total: articles.length,
    updated: successCount,
    results,
  })
}
