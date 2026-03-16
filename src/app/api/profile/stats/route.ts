import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get total articles authored by the user
    const { count: totalArticles, error: articleErr } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id);

    if (articleErr) throw articleErr;

    // 2. Get total accumulated revenue (sum of author_share)
    // Note: Supabase JS library doesn't have a direct SUM function without RPC, 
    // so we will fetch all revenue rows for this user and sum them in JS (since they are author's own rows)
    const { data: revenues, error: revErr } = await supabase
      .from('revenue_shares')
      .select('author_share')
      .eq('author_id', user.id)
      .eq('status', 'settled'); // Assuming 'settled' means payment was successful

    if (revErr) throw revErr;

    const totalRevenue = revenues?.reduce((sum, row) => sum + Number(row.author_share || 0), 0) || 0;

    return NextResponse.json({ 
      totalArticles: totalArticles || 0,
      totalRevenue
    });
  } catch (err: any) {
    console.error('Stats fetch error:', err);
    return NextResponse.json({ error: '통계 정보를 불러오지 못했습니다.' }, { status: 500 });
  }
}
