'use client'

import { useEffect, useState, useRef } from 'react'

const LANGUAGES = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
]

declare global {
  interface Window {
    google: any
    googleTranslateElementInit: () => void
  }
}

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState('ko')
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close dropdown on outside click
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    // Load Google Translate script
    if (document.getElementById('google-translate-script')) {
      setLoaded(true)
      return
    }

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'ko',
          includedLanguages: 'en,ja,zh-CN',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      )
      setLoaded(true)
    }

    const script = document.createElement('script')
    script.id = 'google-translate-script'
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const switchLanguage = (langCode: string) => {
    setCurrentLang(langCode)
    setIsOpen(false)

    if (langCode === 'ko') {
      // Remove translation → restore original
      const frame = document.querySelector('.goog-te-banner-frame') as HTMLIFrameElement
      if (frame) {
        const btn = frame.contentDocument?.querySelector('.goog-close-link') as HTMLElement
        btn?.click()
      }
      // Also try cookie-based reset
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost'
      window.location.reload()
      return
    }

    // Set translation via cookie and trigger
    document.cookie = `googtrans=/ko/${langCode}; path=/;`
    document.cookie = `googtrans=/ko/${langCode}; path=/; domain=.localhost`

    // Trigger Google Translate
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement
    if (select) {
      select.value = langCode
      select.dispatchEvent(new Event('change'))
    }
  }

  const current = LANGUAGES.find(l => l.code === currentLang) ?? LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      {/* Hidden Google Translate element */}
      <div id="google_translate_element" className="hidden" />

      {/* Styled switcher button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        <span className="text-sm">{current.flag}</span>
        <span className="text-slate-300">{current.label}</span>
        <svg className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                currentLang === lang.code
                  ? 'bg-brand-primary/20 text-brand-primary'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
