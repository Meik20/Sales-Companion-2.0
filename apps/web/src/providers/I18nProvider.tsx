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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('fr')

  useEffect(() => {
    const savedLang = (typeof window !== 'undefined' ? localStorage.getItem('sc_lang') : null) as Language
    if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
      setLangState(savedLang)
    } else {
      const match = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)locale=([^;]+)/) : null
      const cookieLang = match?.[1] as Language
      if (cookieLang && (cookieLang === 'fr' || cookieLang === 'en')) {
        setLangState(cookieLang)
      } else {
        // Auto-detect browser language
        const browserLang = typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'fr'
        setLangState(browserLang)
      }
    }
  }, [])

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sc_lang', newLang)
      document.cookie = `locale=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
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
