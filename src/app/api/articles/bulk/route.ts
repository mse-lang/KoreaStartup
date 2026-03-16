import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'editor';

  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    let query = supabase.from('articles').delete().in('id', ids);

    // If not admin, ensure they only delete their own articles
    if (!isAdmin) {
      query = query.eq('author_id', user.id);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
