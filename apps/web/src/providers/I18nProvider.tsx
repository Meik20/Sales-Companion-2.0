'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { fr } from '@/locales/fr'
import { en } from '@/locales/en'

export type Language = 'fr' | 'en'

interface I18nContextType {
  lang: Language
  t: (key: string) => string
  setLang: (lang: Language) => void
}

const I18nContext = createContext<I18nContextType>({
  lang: 'fr',
  t: (key: string) => key,
  setLang: () => {}
})

function getInitialLang(): Language {
  if (typeof window === 'undefined') return 'fr'
  try {
    const savedLang = localStorage.getItem('sc_lang') as Language | null
    if (savedLang === 'fr' || savedLang === 'en') return savedLang

    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)
    const cookieLang = match?.[1] as Language | undefined
    if (cookieLang === 'fr' || cookieLang === 'en') return cookieLang

    return navigator.language.startsWith('en') ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start with SSR-safe default 'fr' to prevent hydration mismatch.
  // The user's actual language preference is reconciled in useEffect (client-only).
  const [lang, setLangState] = useState<Language>('fr')

  useEffect(() => {
    const current = getInitialLang()
    setLangState(current)
  }, [])

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sc_lang', newLang)
      document.cookie = `locale=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
      document.documentElement.setAttribute('lang', newLang === 'en' ? 'en' : 'fr-CM')
    }
  }, [])

  const translations = lang === 'fr' ? fr : en

  const t = useCallback((key: string): string => {
    const keys = key.split('.')
    let val: any = translations
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k as keyof typeof val]
      } else {
        return key
      }
    }
    return typeof val === 'string' ? val : key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}
