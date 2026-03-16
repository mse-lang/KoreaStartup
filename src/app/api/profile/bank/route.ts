import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bank_name, account_number, account_holder } = await request.json();

    if (!bank_name || !account_number || !account_holder) {
      return NextResponse.json({ error: '모든 계좌 정보를 일벽해주세요.' }, { status: 400 });
    }

    // Upsert into author_profiles
    const { error } = await supabase
      .from('author_profiles')
      .upsert({ 
        id: user.id, 
        bank_name, 
        account_number, 
        account_holder,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Bank info save error:', err);
    return NextResponse.json({ error: '계좌 정보 저장에 실패했습니다.' }, { status: 500 });
  }
}
