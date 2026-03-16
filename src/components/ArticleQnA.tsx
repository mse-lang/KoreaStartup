'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface ArticleQnAProps {
  articleId: string;
  articleTitle: string;
}

const SUGGESTED_QUESTIONS = [
  '이 기사의 핵심 내용은 무엇인가요?',
  '투자 규모와 투자자는 누구인가요?',
  '이 기업의 주요 서비스/기술은?',
  '시장에 미치는 영향은?',
];

export default function ArticleQnA({ articleId, articleTitle }: ArticleQnAProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const askQuestion = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, question }),
      });

      const data = await res.json();
      const aiMsg: Message = {
        role: 'ai',
        content: data.answer || data.error || '응답을 생성할 수 없습니다.',
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '네트워크 오류가 발생했습니다.' }]);
    }

    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(input);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bento-card px-5 py-3 flex items-center gap-3 hover:border-brand-primary/40 transition-all group w-full"
      >
        <span className="text-2xl">🤖</span>
        <div className="text-left flex-1">
          <p className="font-bold text-sm text-white group-hover:text-brand-primary transition-colors">AI에게 이 기사에 대해 질문하기</p>
          <p className="text-xs text-slate-500">핵심 내용, 투자 정보, 기술 분석 등을 물어보세요</p>
        </div>
        <span className="text-slate-400 text-lg">💬</span>
      </button>
    );
  }

  return (
    <section className="bento-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-brand-primary/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-bold text-sm">AI 기사 어시스턴트</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          접기 ▲
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-3">💡 추천 질문을 눌러보세요:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => askQuestion(q)}
                  className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-300 hover:bg-brand-primary/20 hover:text-brand-primary hover:border-brand-primary/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-primary text-white rounded-br-md'
                  : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-md'
              }`}
            >
              {msg.role === 'ai' && <span className="text-xs text-brand-primary font-medium block mb-1">🤖 AI</span>}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
              <span className="text-brand-primary text-xs font-medium block mb-1">🤖 AI</span>
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/5 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="이 기사에 대해 궁금한 점을 질문하세요..."
          className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/30 transition-all"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary px-4 text-sm disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </section>
  );
}
