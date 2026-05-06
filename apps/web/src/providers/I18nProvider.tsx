'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  t: () => '',
  setLang: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('fr')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedLang = localStorage.getItem('sc_lang') as Language
    if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
      setLangState(savedLang)
    } else {
      // Auto-detect browser language
      const browserLang = navigator.language.startsWith('en') ? 'en' : 'fr'
      setLangState(browserLang)
    }
    setMounted(true)
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('sc_lang', newLang)
  }

  const translations = lang === 'fr' ? fr : en

  const t = (key: string): string => {
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
  }

  // Prevent hydration mismatch by rendering default (fr) or hiding content until mounted
  // For SEO, we might want to just render with default lang
  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      <div style={{ visibility: mounted ? 'visible' : 'hidden', display: 'contents' }}>
         {children}
      </div>
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}
