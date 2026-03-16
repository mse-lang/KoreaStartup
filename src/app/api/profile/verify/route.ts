import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Upsert into author_profiles to set is_verified = true
    const { error } = await supabase
      .from('author_profiles')
      .upsert({ id: user.id, is_verified: true, updated_at: new Date().toISOString() });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: '본인인증 처리에 실패했습니다.' }, { status: 500 });
  }
}
