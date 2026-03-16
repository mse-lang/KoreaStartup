import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Note: Gemini doesn't directly generate images natively in the standard text API yet.
// For a real production app, you'd use DALL-E 3 (OpenAI) or Stable Diffusion here.
// But as requested, we will mock the image generation by returning a stylish URL 
// or using a placeholder service that generates images based on text, like image.pollinations.ai

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다.' }, { status: 400 });
    }

    // Since we only have GEMINI_API_KEY in this environment, and Gemini doesn't do 
    // direct image generation via getGenerativeModel, we will use a free text-to-image 
    // API (pollinations.ai) to generate the thumbnail dynamically based on the title/prompt.
    
    // Clean prompt for URL
    const safePrompt = encodeURIComponent(prompt.trim() + ' startup technology modern flat design');
    const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=400&nologo=true`;

    return NextResponse.json({ url: imageUrl });

  } catch (err: any) {
    console.error('Image Gen Error:', err);
    return NextResponse.json({ error: '이미지 생성 실패', details: err.message }, { status: 500 });
  }
}
