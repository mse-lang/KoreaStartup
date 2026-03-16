import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const articleId = searchParams.get('articleId');

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(new URL(`/?error=invalid_payment`, request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/login?redirect=/article/${articleId}`, request.url));
  }

  // Toss API verification using Secret Key
  const secretKey = process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R';
  const encodedKey = Buffer.from(secretKey + ':').toString('base64');
  
  try {
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Toss Error:', err);
      return NextResponse.redirect(new URL(`/article/${articleId}?error=payment_failed`, request.url));
    }

    // Insert or update subscription in DB
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await supabase.from('user_subscriptions').insert({
      user_id: user.id,
      status: 'active',
      payment_key: paymentKey,
      order_id: orderId,
      amount: parseFloat(amount),
      expires_at: expiresAt.toISOString(),
    });

    // 40% Revenue Share Logic
    if (articleId) {
      const { data: art } = await supabase.from('articles').select('author_id, is_premium').eq('id', articleId).single();
      if (art && art.is_premium && art.author_id) {
        const totalAmount = parseFloat(amount);
        const authorShare = totalAmount * 0.40;
        const platformShare = totalAmount - authorShare;

        await supabase.from('revenue_shares').insert({
          article_id: articleId,
          author_id: art.author_id,
          buyer_id: user.id,
          payment_key: paymentKey,
          total_amount: totalAmount,
          author_share: authorShare,
          platform_share: platformShare,
          status: 'pending',
        });
      }
    }

    // Success -> redirect back to the article to read the unblurred version
    return NextResponse.redirect(new URL(`/article/${articleId}?success=unlocked`, request.url));
  } catch (error) {
    console.error('Confirmation Error:', error);
    return NextResponse.redirect(new URL(`/article/${articleId}?error=server_error`, request.url));
  }
}
