'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors theme-toggle-btn"
      title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      <span className="text-sm">{theme === 'dark' ? '🌙' : '☀️'}</span>
      <span className="hidden sm:inline">{theme === 'dark' ? '다크' : '라이트'}</span>
    </button>
  )
}
