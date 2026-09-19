'use client'

import { useTranslation, Language } from '@/providers/I18nProvider'

export function LanguageSwitcher() {
  const { lang, setLang } = useTranslation()

  const switchLocale = (next: Language) => {
    if (next === lang) return
    setLang(next)
  }

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-secondary/60 p-0.5 text-xs font-semibold"
      role="group"
      aria-label="Sélecteur de langue"
    >
      <button
        type="button"
        onClick={() => switchLocale('fr')}
        className={`rounded-md px-2.5 py-1 transition-all ${
          lang === 'fr'
            ? 'bg-card text-[#1B7A3E] font-bold shadow-xs border border-border/80'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-pressed={lang === 'fr'}
        title="Français"
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => switchLocale('en')}
        className={`rounded-md px-2.5 py-1 transition-all ${
          lang === 'en'
            ? 'bg-card text-[#1B7A3E] font-bold shadow-xs border border-border/80'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-pressed={lang === 'en'}
        title="English"
      >
        EN
      </button>
    </div>
  )
}
