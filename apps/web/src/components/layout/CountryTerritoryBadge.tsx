'use client'

import { useState, useRef, useEffect } from 'react'
import {
  SUPPORTED_COUNTRIES,
  COUNTRY_CURRENCIES,
  COUNTRY_TAX_LABELS,
  type CountryCode
} from '@sales-companion/shared'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'
import { ChevronDown, Globe, Sparkles, Check } from 'lucide-react'

export function CountryTerritoryBadge() {
  const { code, name, flag, currency, taxLabel, setCountry } = useProspectingCountryDetails()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition-all hover:border-primary/50 hover:bg-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Changer de pays de prospection"
        title={`Marché actif : ${name} (${currency})`}
      >
        {/* Flag + Pulse Indicator */}
        <div className="relative flex items-center justify-center text-sm transition-transform group-hover:scale-110">
          <span>{flag}</span>
          <span
            className="absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse"
            style={{
              backgroundColor: 'var(--country-primary, #059669)',
              boxShadow: '0 0 6px var(--country-glow, rgba(5,150,105,0.8))'
            }}
          />
        </div>

        {/* Text Details */}
        <div className="flex flex-col items-start leading-tight">
          <span className="font-bold text-[11px] text-foreground tracking-tight">{name}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
            {currency} · {taxLabel}
          </span>
        </div>

        <ChevronDown
          size={12}
          className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 top-[42px] z-[300] w-[260px] overflow-hidden rounded-2xl border border-border bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Globe size={13} className="text-primary" />
              <span>Territoires de Prospection</span>
            </div>
            <p className="text-[10.5px] text-muted-foreground mt-0.5">
              Sélectionnez le marché local à explorer.
            </p>
          </div>

          <div className="flex flex-col gap-1 py-1 max-h-[280px] overflow-y-auto">
            {SUPPORTED_COUNTRIES.map((c) => {
              const isSelected = c.code === code
              const curr = COUNTRY_CURRENCIES[c.code]
              const tax = COUNTRY_TAX_LABELS[c.code]

              return (
                <button
                  key={c.code}
                  onClick={() => {
                    setCountry(c.code as CountryCode)
                    setIsOpen(false)
                  }}
                  className={`flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
                    isSelected
                      ? 'bg-primary/15 text-primary font-bold shadow-xs'
                      : 'text-foreground hover:bg-secondary/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{c.flag}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold leading-tight">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {curr} · {tax} · {c.dialCode}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
