'use client'

import { useCallback, useEffect, useState } from 'react'

type Locale = 'fr' | 'en'

const COOKIE_NAME = 'locale'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 an

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'fr'
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  const val = match?.[1]
  return val === 'en' ? 'en' : 'fr'
}

export function LanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>('fr')

  useEffect(() => {
    setLocale(getLocaleFromCookie())
  }, [])

  const switchLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return
      document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
      setLocale(next)
      window.location.reload()
    },
    [locale]
  )

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-secondary/60 p-0.5 text-xs font-semibold"
      role="group"
      aria-label="Sélecteur de langue"
    >
      <button
        onClick={() => switchLocale('fr')}
        className={`rounded-md px-2.5 py-1 transition-all ${
          locale === 'fr'
            ? 'bg-card text-[#1B7A3E] font-bold shadow-xs border border-border/80'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-pressed={locale === 'fr'}
        title="Français"
      >
        FR
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={`rounded-md px-2.5 py-1 transition-all ${
          locale === 'en'
            ? 'bg-card text-[#1B7A3E] font-bold shadow-xs border border-border/80'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-pressed={locale === 'en'}
        title="English"
      >
        EN
      </button>
    </div>
  )
}
