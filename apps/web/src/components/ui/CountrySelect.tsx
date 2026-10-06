'use client'

import React, { useState, useRef, useEffect } from 'react'
import { SUPPORTED_COUNTRIES } from '@sales-companion/shared'
import { ChevronDown, Check } from 'lucide-react'

export function CountryFlag({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' | 'lg' }) {
  const width = size === 'sm' ? 18 : size === 'lg' ? 24 : 20
  const height = size === 'sm' ? 13 : size === 'lg' ? 17 : 14

  switch (code.toUpperCase()) {
    case 'CM':
      // Cameroun : Vert, Rouge avec étoile jaune, Jaune
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 20 14"
          className="rounded-[2px] shadow-sm shrink-0 border border-black/10 overflow-hidden"
          aria-label="Drapeau Cameroun"
        >
          <rect width="6.66" height="14" fill="#007a5e" />
          <rect x="6.66" width="6.66" height="14" fill="#ce1126" />
          <rect x="13.33" width="6.67" height="14" fill="#fcd116" />
          <polygon
            points="10,4.2 10.6,5.9 12.4,5.9 10.9,7 11.5,8.7 10,7.6 8.5,8.7 9.1,7 7.6,5.9 9.4,5.9"
            fill="#fcd116"
          />
        </svg>
      )
    case 'SN':
      // Sénégal : Vert, Jaune avec étoile verte, Rouge
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 20 14"
          className="rounded-[2px] shadow-sm shrink-0 border border-black/10 overflow-hidden"
          aria-label="Drapeau Sénégal"
        >
          <rect width="6.66" height="14" fill="#00853f" />
          <rect x="6.66" width="6.66" height="14" fill="#fdef42" />
          <rect x="13.33" width="6.67" height="14" fill="#e31b23" />
          <polygon
            points="10,4.2 10.6,5.9 12.4,5.9 10.9,7 11.5,8.7 10,7.6 8.5,8.7 9.1,7 7.6,5.9 9.4,5.9"
            fill="#00853f"
          />
        </svg>
      )
    case 'CI':
      // Côte d'Ivoire : Orange, Blanc, Vert
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 20 14"
          className="rounded-[2px] shadow-sm shrink-0 border border-black/10 overflow-hidden"
          aria-label="Drapeau Côte d'Ivoire"
        >
          <rect width="6.66" height="14" fill="#f77f00" />
          <rect x="6.66" width="6.66" height="14" fill="#ffffff" />
          <rect x="13.33" width="6.67" height="14" fill="#009e60" />
        </svg>
      )
    case 'BJ':
      // Bénin : Vert à gauche, Jaune et Rouge à droite
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 20 14"
          className="rounded-[2px] shadow-sm shrink-0 border border-black/10 overflow-hidden"
          aria-label="Drapeau Bénin"
        >
          <rect width="8" height="14" fill="#008751" />
          <rect x="8" y="0" width="12" height="7" fill="#fcd116" />
          <rect x="8" y="7" width="12" height="7" fill="#e8112d" />
        </svg>
      )
    case 'TG':
      // Togo : 5 bandes horizontales vert/jaune, carré rouge avec étoile blanche
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 20 14"
          className="rounded-[2px] shadow-sm shrink-0 border border-black/10 overflow-hidden"
          aria-label="Drapeau Togo"
        >
          <rect width="20" height="2.8" y="0" fill="#006a4e" />
          <rect width="20" height="2.8" y="2.8" fill="#ffce00" />
          <rect width="20" height="2.8" y="5.6" fill="#006a4e" />
          <rect width="20" height="2.8" y="8.4" fill="#ffce00" />
          <rect width="20" height="2.8" y="11.2" fill="#006a4e" />
          <rect width="8" height="8.4" fill="#d21034" />
          <polygon
            points="4,2.2 4.4,3.4 5.6,3.4 4.6,4.1 5,5.3 4,4.5 3,5.3 3.4,4.1 2.4,3.4 3.6,3.4"
            fill="#ffffff"
          />
        </svg>
      )
    case 'TD':
      // Tchad : Bleu, Jaune, Rouge
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 20 14"
          className="rounded-[2px] shadow-sm shrink-0 border border-black/10 overflow-hidden"
          aria-label="Drapeau Tchad"
        >
          <rect width="6.66" height="14" fill="#002664" />
          <rect x="6.66" width="6.66" height="14" fill="#fecb00" />
          <rect x="13.33" width="6.67" height="14" fill="#c60c30" />
        </svg>
      )
    case 'CF':
      // Centrafrique : Bleu, Blanc, Vert, Jaune, bande centrale rouge, étoile jaune
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 20 14"
          className="rounded-[2px] shadow-sm shrink-0 border border-black/10 overflow-hidden"
          aria-label="Drapeau République Centrafricaine"
        >
          <rect width="20" height="3.5" y="0" fill="#003082" />
          <rect width="20" height="3.5" y="3.5" fill="#ffffff" />
          <rect width="20" height="3.5" y="7" fill="#289728" />
          <rect width="20" height="3.5" y="10.5" fill="#ffce00" />
          <rect x="8" width="4" height="14" fill="#d21034" />
          <polygon
            points="2.5,0.6 2.8,1.4 3.6,1.4 3,1.9 3.2,2.7 2.5,2.2 1.8,2.7 2,1.9 1.4,1.4 2.2,1.4"
            fill="#ffce00"
          />
        </svg>
      )
    default:
      return <span className="text-sm">🌍</span>
  }
}

interface CountrySelectProps {
  value: string
  onChange: (code: string) => void
  lang?: 'fr' | 'en'
  placement?: 'bottom' | 'top'
}

export function CountrySelect({ value, onChange, lang = 'fr', placement = 'top' }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedCountry = SUPPORTED_COUNTRIES.find((c) => c.code === value) ?? SUPPORTED_COUNTRIES[0]!

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Bouton déclencheur stylé */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full cursor-pointer items-center justify-between rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium text-foreground outline-none transition-colors hover:border-primary/60 focus:border-primary"
      >
        <span className="flex items-center gap-2.5 truncate">
          <CountryFlag code={selectedCountry.code} />
          <span className="truncate">{lang === 'en' ? selectedCountry.nameEn : selectedCountry.name}</span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu déroulant ouvert vers le haut (dropup) avec vrais drapeaux SVG */}
      {isOpen && (
        <div
          className={`absolute left-0 z-50 max-h-[240px] w-full overflow-y-auto rounded-[10px] border border-border bg-card p-1 shadow-2xl ${
            placement === 'top' ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]'
          }`}
        >
          {SUPPORTED_COUNTRIES.map((c) => {
            const isSelected = c.code === selectedCountry.code
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code)
                  setIsOpen(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                  isSelected
                    ? 'bg-primary/10 font-bold text-primary'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <CountryFlag code={c.code} />
                  <span className="truncate">{lang === 'en' ? c.nameEn : c.name}</span>
                </span>
                {isSelected && <Check size={13} className="text-primary shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
