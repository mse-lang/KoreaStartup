'use client';

import { loadTossPayments } from '@tosspayments/payment-sdk';
import { useState } from 'react';

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

export default function TossPaymentWidget({ articleId, orderId, isLoggedIn }: { articleId: string, orderId: string, isLoggedIn: boolean }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!isLoggedIn) {
      window.location.href = `/login?redirect=/article/${articleId}`;
      return;
    }

    setLoading(true);
    try {
      const tossPayments = await loadTossPayments(clientKey);
      await tossPayments.requestPayment('카드', {
        amount: 4900,
        orderId: orderId,
        orderName: '프리미엄 무제한 읽기 (1개월)',
        customerName: '고객님',
        successUrl: `${window.location.origin}/api/payments/confirm?articleId=${articleId}`,
        failUrl: `${window.location.origin}/article/${articleId}?fail=true`,
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-[20%] flex flex-col items-center justify-end bg-gradient-to-t from-[#0f172a] via-[#0f172a]/95 to-transparent p-6 text-center z-10 pb-32">
      <div className="bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl border border-white/10 max-w-sm shadow-2xl flex flex-col gap-4 mx-auto w-full">
        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-purple-400">
          프리미엄 인사이트
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          이 기사의 전체 원문과 전문 분석을 시원하게 읽으시려면 프리미엄 구독이 필요합니다.
        </p>
        <div className="text-2xl font-bold font-mono text-white mb-2">₩4,900 <span className="text-sm font-normal text-slate-400">/ 월</span></div>
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full btn-primary shadow-lg shadow-brand-primary/30 py-3 text-lg transition-transform hover:scale-[1.02]"
        >
          {loading ? '결제 창 준비 중...' : '✨ 프리미엄 구독하기'}
        </button>
      </div>
    </div>
  );
}
