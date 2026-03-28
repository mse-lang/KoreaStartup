interface AISummaryCardProps {
  lines: string[]
  className?: string
}

export default function AISummaryCard({ lines, className = '' }: AISummaryCardProps) {
  if (lines.length === 0) return null;

  return (
    <div className={`bento-card p-5 sm:p-6 border-violet-500/30 relative overflow-hidden ${className}`}>
      {/* Decorative violet glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />

      <h2 className="relative z-10 text-lg font-bold mb-4 flex items-center gap-2 text-violet-400">
        <span className="text-2xl">🤖</span>
        AI 핵심 요약
      </h2>
      <ol className="relative z-10 space-y-3">
        {lines.map((line, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold mt-0.5 border border-violet-500/30">
              {idx + 1}
            </span>
            <p className="text-sm sm:text-base leading-relaxed text-slate-200">
              {line}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
