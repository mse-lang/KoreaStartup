import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const aiConfig = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const aiModel = aiConfig.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

export async function POST(request: Request) {
  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 본문이 필요합니다.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const prompt = `당신은 스타트업 전문 뉴스 큐레이터입니다. 다음 글을 읽고 핵심 정보 5가지를 번호 매기기로 요약해주세요. 응답은 오직 요약 내용만 출력하세요.\n\n[제목]: ${title}\n[본문]:\n${content.substring(0, 4000)}`;
    const result = await aiModel.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ summary: text.trim() });
  } catch (err: any) {
    console.error('AI Summary Error:', err);
    return NextResponse.json({ error: '요약 생성에 실패했습니다.', details: err.message }, { status: 500 });
  }
}
